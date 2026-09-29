param(
	[Parameter(Mandatory=$true)][string]$Code,
	[string]$CodexxTestReply
)

$ErrorActionPreference='Stop'
$uri='http://localhost:8080/Varjs/JsEvalCodexServer.sha256_02497a234fe14e91c57a0a346a32b63f0660e2f3cd13f88c31a313fdd27c8d33.jsp'
$headers=@{
	'Origin'='http://localhost:8080'
	'Sec-Fetch-Site'='same-origin'
	'X-Varjs-q.Opt.EnableJsEvalCodexServer'='1'
	'X-Varjs-q.Opt.EnableBellsackMultiplayerServer'='0'
}
$counter=0
function New-Id([string]$prefix){
	$script:counter++
	return $prefix+':'+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+':'+$script:counter
}
function Send-Envelope($envelope){
	$body=$envelope|ConvertTo-Json -Compress -Depth 12
	$response=Invoke-WebRequest -UseBasicParsing -Uri $uri -Method Post -Headers $headers -ContentType 'application/json; charset=UTF-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 45
	return $response.Content|ConvertFrom-Json
}
function New-Envelope([string]$op,[string]$id,[string]$sender,[string]$recipient,[string]$serverGeneration,[string]$browserId,[string]$documentId){
	return [ordered]@{
		type='JsEvalCodexServer';version=1;op=$op;id=$id;replyTo=$null;messageType='control'
		sender=$sender;recipient=$recipient;bindingId='codexLive';browserId=$browserId
		documentId=$documentId;serverGeneration=$serverGeneration
	}
}

$sender='agent:codexLive'
$bind=New-Envelope 'bind' (New-Id 'agent-bind') $sender 'server' '' '' ''
$bind.launchGeneration='agent-live-test'
$bound=Send-Envelope $bind
if($bound.op-ne'bound'){throw 'Agent bind failed: '+($bound|ConvertTo-Json -Compress)}
$generation=[string]$bound.serverGeneration

$statusRequest=New-Envelope 'status' (New-Id 'agent-status') $sender 'server' $generation '' ''
$status=Send-Envelope $statusRequest
if($status.op-ne'status'){throw 'Status failed: '+($status|ConvertTo-Json -Compress)}
$browserId=[string]$status.activeBrowserId
$documentId=[string]$status.activeDocumentId
if(!$browserId-or!$documentId){throw 'No active codexLive browser document'}

$evalId=New-Id 'agent-eval'
$eval=New-Envelope 'send' $evalId $sender ('browser:'+$browserId) $generation $browserId $documentId
$eval.messageType='eval';$eval.msgsUp=@();$eval.msgsDown=@($Code)
$accepted=Send-Envelope $eval
if($accepted.op-ne'accepted'){throw 'Eval was not accepted: '+($accepted|ConvertTo-Json -Compress)}

$deadline=[DateTimeOffset]::UtcNow.AddSeconds(90)
do{
	$receive=New-Envelope 'receive' (New-Id 'agent-receive') $sender $sender $generation $browserId $documentId
	$delivery=Send-Envelope $receive
	if($delivery.op-eq'deliver'-and$delivery.messageType-eq'codexx'-and$PSBoundParameters.ContainsKey('CodexxTestReply')){
		$reply=New-Envelope 'send' (New-Id 'agent-reply') $sender ('browser:'+$browserId) $generation $browserId $documentId
		$reply.messageType='reply';$reply.replyTo=[string]$delivery.id;$reply.msgsUp=@();$reply.msgsDown=@($CodexxTestReply)
		$replyAccepted=Send-Envelope $reply
		if($replyAccepted.op-ne'accepted'){throw 'codexx test reply was not accepted'}
		continue
	}
	if($delivery.op-eq'deliver'-and$delivery.messageType-eq'evalResult'-and$delivery.replyTo-eq$evalId){
		if($delivery.msgsUp.Count){[Console]::Out.Write([string]$delivery.msgsUp[0])}
		exit 0
	}
}while([DateTimeOffset]::UtcNow-lt$deadline)
throw 'Timed out waiting for eval result'
