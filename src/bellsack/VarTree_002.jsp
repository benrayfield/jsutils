<%@ page import="java.text.DecimalFormat, java.io.*, java.util.*, java.net.URLDecoder, jakarta.servlet.http.*, jakarta.servlet.*" %><%@ page contentType="application/json" %><%!
	static{
		System.out.println("Dagverse static code block starting.");
	}
	
	static String escapeString(String input){
		StringBuilder escapedString = new StringBuilder();
		escapedString.append("\"");
		for (char ch : input.toCharArray()) {
			switch (ch) {
				case '\n':
					escapedString.append("\\n");
				break;case '\t':
					escapedString.append("\\t");
				break;case '\"':
					escapedString.append("\\\"");
				break;case '\\':
					escapedString.append("\\\\");
				break;default:
					escapedString.append(ch);
			}
		}
		escapedString.append("\"");
		return escapedString.toString();
	}
	
	static void returnFile(File file, String contentType, HttpServletResponse response){
		if(file.exists()){
		    ServletOutputStream servletOutputStream = null;
		    FileInputStream fileInputStream = null;
		    try{
		    	servletOutputStream = response.getOutputStream();
			    fileInputStream = new FileInputStream(file);
		        byte[] buffer = new byte[(int) file.length()]; // Allocate a buffer the size of the file
		        fileInputStream.read(buffer); // Read the file into the buffer
				response.setContentType(contentType);
				response.setContentLength(buffer.length);
		        servletOutputStream.write(buffer); // Write the buffer to the servlet output stream
		    }catch(IOException e){
		    	throw new RuntimeException(e);
		    }finally{
		        if(fileInputStream != null){
		        	try{
		        		fileInputStream.close();
		        	}catch(IOException e){
		        		e.printStackTrace(System.err);
		        	}
		        }
		        if(servletOutputStream != null){
		        	try{
		        		servletOutputStream.close();
		        	}catch(IOException e){
		        		e.printStackTrace(System.err);
		        	}
		        }
		    }
		}
	}
	
	static String firstPage = "dagball.html";
	
	public static final long nanoOffset;
	
	//public static final int secondsPerDay = 24*60*60;
	
	protected static final DecimalFormat secondsFormat  = new DecimalFormat("0000000000.0000000");
	
	static{
		long startMillis = System.currentTimeMillis();
		long startNano = System.nanoTime();
		//nanoOffset = startNanoxxxx
		/*nowSeconds = .001*startMillis + 1e-9*nanoDiff;
		nowNano = nowSeconds*1e9
		nowNano = (.001*startMillis + 1e-9*nanoDiff)*1e9
		nowNano = (.001*startMillis*1e9 + nanoDiff)
		nowNano = startMillis*1000000 + nanoDiff
		nanoDiff = System.nanoTime()-startNano
		nowNano = startMillis*1000000 + (System.nanoTime()-startNano);
		*/
		nanoOffset = startMillis*1000000 - startNano;
		//nowNano = nanoOffset+System.nanoTime(); (this code goes in nowNano())
	}
	
	/** Seconds since year 1970 UTC
	with relative nanosecond precision (System.nanoTime)
	and absolute few milliseconds precision (System.currentTimeMillis).
	<br><br>
	Practically, at least in normal computers in year 2011, this has about microsecond precision
	because you can only run it a few million times per second.
	TODO test it again on newer computers.
	*/
	public static double now(){
		return nowNano()*1e-9;
		/*
		//TODO optimize by caching the 2 start numbers into 1 double
		long nanoDiff = System.nanoTime()-startNano;
		return .001*startMillis + 1e-9*nanoDiff;
		*/ 
	}
	
	private static long lastTimeId = Long.MIN_VALUE;
	
	/** utcnano. nowNano()/1e9 means the same time as (double)now(), except roundoff and lag */
	public static long nowNano(){
		return nanoOffset+System.nanoTime();
	}
	
	/** max of number of nanoseconds since year 1970 UTC vs the last value returned + 1.
	This can practically allocate a million ids per second
	and in theory a billion per second (especially if you use timeIds(int) to get a block of these longs).
	*
	public static synchronized long timeId(){
		//long utcNanoseconds = System.nanoTime()-startNano;
		return lastTimeId = Math.max(lastTimeId+1, nowNano());
	}
	
	/** returns the last in a block of timeIds.
	Example:
	long wId = timeId();
	long yId = blockOfTimeIds(2);
	long xId = yId-1;
	long zId = timeId();
	TODO If param is big, you might have to wait for time to catch up as dont want it to get much out of sync with utc time.
	*
	public static synchronized long timeIds(int blockSize){
		if(blockSize < 1) throw new Error("blockSize must be positive: "+blockSize);
		lastTimeId += blockSize;
		return lastTimeId;
	}*/
	
	public static String nowStr(){
		return timeStr(now());
	}
	
	//always fits in double until around year 2255 since double can exactly do plus and minus as int54 (signed) if it doesnt overflow. rounds to whole microsecond.
	public static long nowMicroseconds(){
		return ((nowNano()+500)/1000);
	}
	
	public static String timeStr(double time){
		return secondsFormat.format(time);
	}
%><%
	/*
	Doesnt work yet.
	
	Renamed this from RunServerInBrowser.jsp to index.jsp
	
	If tomcat says this: "Invalid character found in the request target [/dagverse/RunServerInBrowser.jsp?[%22hello%22] ].
	The valid characters are defined in RFC 7230 and RFC 3986"...
	you must adjust the Connector tag in server.xml if you want to allow json chars in url after the "?".
	<Connector port="8080" relaxedQueryChars="^`{}[]|&quot;&lt;&gt;\\"/>
	
	Optionally put this in tomcat's web.xml to turn off caching (of .js and .html files for example) if you're editing them:
	<filter>
	    <filter-name>ExpiresFilter</filter-name>
	    <filter-class>org.apache.catalina.filters.ExpiresFilter</filter-class>
	    <init-param>
	        <param-name>ExpiresDefault</param-name>
	        <param-value>access plus 0 seconds</param-value>
	    </init-param>
	</filter>
	<filter-mapping>
	    <filter-name>ExpiresFilter</filter-name>
	    <url-pattern>/*</url-pattern>
	</filter-mapping>
	
	http://localhost:8080/dagverse/?[%22this%22,%22is%22,{%22json%22:44}]
	[{"error": "todo this is for dagball/dagplace players to http call func=null input=["this","is",{"json":44}]"}]
	
	write index.jsp that runs in tomcat that makes a browser tab running on same computer which does
	an ajax act as a server that others across internet can send json to and get a json response.
	I will boot tomcat with that jsp in it, then open browser which will ajax to
	http://localhost:8080/dagverse?func=runServerInBrowser then other computers across the internet
	can ajax post json to http://localhost:8080/dagverse and get json back. Tomcat will act as a
	proxy for my local browser tab which has the server logic. However many http requests come in
	to tomcat at http://localhost:8080/dagverse (not the func=runServerInBrowser) before the next
	post to http://localhost:8080/dagverse?func=runServerInBrowser, group them together into a json
	list of those jsons (objects all the way through, not a list of json strings) and send them
	as the response to the http://localhost:8080/dagverse?func=runServerInBrowser call. The browser
	tab that made the http://localhost:8080/dagverse?func=runServerInBrowser call, when it gets that
	from tomcat, does some logic then answers back to tomcat a json list of the same size. Tomcat
	should then split the list and send its contents (1 index each) to the waiting worker threads
	which called http://localhost:8080/dagverse . This should be a general multiplexing proxy that
	allows a browser tab to act as a server.
	*/
	
	
	//TODO limit the number of players from the same client internet address,
	//such as max 4 per address in case people in the same house join at once
	//or if they are using tor or other proxy.
	
	
	
	//TODO allow caching only if all requests are to download the contents of hashIds,
	//but if its to upload hashIds and their contents, the server might have deleted them to save memory (uncached)
	//so cache them again from that. If some of it is pubkeys (somePrefix_ed25519key) then it means to get the newest
	//[time,value] signed along with the sig and publickey: {pubkey:..., sig:..., msg:[time,value]}.
	// Step 1: Prevent caching
    response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    response.setHeader("Pragma", "no-cache");
    response.setDateHeader("Expires", 0);
	
	/* to fix this...
	when i click the "test html" button
	loadHtml, len=636 VarTree.html:228:10
	XHRGET
	http://localhost:8080/bellsack/dagballIndex.jsp?func=simpleNetInfo
	CORS Missing Allow Origin
	Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8080/bellsack/dagballIndex.jsp?func=simpleNetInfo. (Reason: CORS header ‘Access-Control-Allow-Origin’ missing). Status code: 200.
	*/
	response.setHeader("Access-Control-Allow-Origin", "*");

    // Step 2: Initialize a variable to hold request data
    String requestData = "";
    boolean isJsonData = false;

    // Determine the type of request and extract data accordingly
    if ("GET".equalsIgnoreCase(request.getMethod())) {
        String queryString = request.getQueryString();
        if (queryString != null && (queryString.startsWith("{") || queryString.startsWith("[")
        		|| queryString.startsWith("%7B") || queryString.startsWith("%5B"))) {
            //requestData = URLDecoder.decode(queryString, "UTF-8");
            requestData = URLDecoder.decode(queryString, "UTF-8");
            isJsonData = true;
        }
    } else if ("POST".equalsIgnoreCase(request.getMethod())) {
        StringBuilder sb = new StringBuilder();
        String line;
        try (BufferedReader reader = request.getReader()) {
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }
        requestData = sb.toString();
        if (requestData.startsWith("{") || requestData.startsWith("[")) {
            isJsonData = true;
        }
    }

    /*
    // Step 3: Process the request data
    // Example: Add JSON data to a queue or return a response based on the requestData
    if (isJsonData) {
        // If requestData is JSON, process it accordingly
        // This could involve parsing the JSON, storing it, or adding it to an application-wide queue
        
        // Example processing (pseudo-code, replace with actual logic)
        // processJsonData(requestData);

        // For demonstration, just output the requestData
        out.println(requestData);
    } else {
        // Handle non-JSON data or other request processing
        out.println("{\"message\": \"No JSON data found\"}");
    }
    */
    
 	//Simple in-memory queue for storing JSON requests
 	List<String> requestQueue = (List<String>) application.getAttribute("requestQueue");
 	if (requestQueue == null) {
 		requestQueue = new ArrayList<>();
 		application.setAttribute("requestQueue", requestQueue);
 	}
	
 	
 	String jsonInput = requestData;
	

 	String func = request.getParameter("func");
 	System.out.println("func="+func+" jsonInput=\n"+jsonInput);
 	List<String> mergedRequests = new ArrayList();
 	String returnThisDirectly = null;
 	if(requestData.length()==0 && func == null){
 		returnFile(new File(application.getRealPath("/")+firstPage),"text/html; charset=UTF-8",response);
 		return;
 	}else if(func == null){
 		//Normal client (small json in url with http get or as post data in http post).
 		mergedRequests.add("{\"error\": \"todo this is for dagball/dagplace players to http call func="+func+" input="+jsonInput+"\"}");
 		//TODO if requestData is empty, return the dagball html which refers to some lib/*.js files which will be
 	}else if(func.equals("runServerInBrowser")){
 		//FIXME make sure that either the caller is thru localhost OR has a password or signed something etc,
 		//cuz dont want just anyone acting as the server with my local tomcat. they can do that with their copy of tomcat.
 		//But TODO i will eventually want to put the tomcat server on a cloud computer
 		//so it can get more incoming http connections at once. Maybe will run the browser there too,
 		//or maybe still from a computer near me. Make it work both ways.
 		
 		//The one browser tab acting as server thru this jsp as proxy multiplexer (small json in url with http get or as post data in http post).
 		//This is just 1 cycle of it. Get the 
 		mergedRequests.add("{\"error\": \"todo runServerInBrowser func="+func+"\"}");
 	}else if(func.equals("simpleNetInfo")){
 		//mergedRequests.add("{simpleNetInfo:{\"clientInetAddr\":"+escapeString(request.getRemoteAddr())+"}}");
 		//returnThisDirectly = "{\"clientInetAddr\":"+escapeString(request.getRemoteAddr())+", \"serverInetAddr\":"+escapeString(request.getLocalAddr())+"}";
 		returnThisDirectly = "{\"clientInetAddr\":"+escapeString(request.getRemoteAddr())+", \"time\":"+nowMicroseconds()+"}";
 	}else{
 		mergedRequests.add("{\"error\": \"func="+func+"\"}");
 	}
 	if(returnThisDirectly != null){
 		out.print(returnThisDirectly);
 	}else{
		out.print('[');
	 	for(int r=0; r<mergedRequests.size(); r++){
	 	 	//return list of strings without parsing them, so server is faster and uses less memory.
	 	 	//Browser can decide what to do with invalid json or whatever string it might be.
	 	 	if(r > 0) out.print(",\n");
	 		out.print(escapeString(mergedRequests.get(r))); //FIXME make sure this is printing as UTF-8
	 	}
	 	out.print(']');
 	}
 	
 	/*requestQueue.add(jsonInput);

	// Placeholder response until real response is ready
	synchronized (requestQueue) {
		requestQueue.wait(); // Wait for response from browser tab
	}
	// Retrieve and send the real response
	String jsonResponse = (String) application.getAttribute("jsonResponse");
	out.println(jsonResponse);
	*/
	

	
	
	
	
	/*
    // Set headers to ensure the response is not cached
    response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    response.setHeader("Pragma", "no-cache");
    response.setDateHeader("Expires", 0);

    // Initialize a variable to hold the JSON data
    String jsonData = "";

    if ("GET".equalsIgnoreCase(request.getMethod())) {
        // For GET requests, extract the JSON data from the query string
        String queryString = request.getQueryString();
        if (queryString != null && (queryString.startsWith("%7B") || queryString.startsWith("%5B"))) { // URL encoded '{' or '['
            jsonData = URLDecoder.decode(queryString, "UTF-8");
        } else {
            // Handle normal URL parameter processing
        }
    } else if ("POST".equalsIgnoreCase(request.getMethod())) {
        // For POST requests, read the JSON data from the request body
        StringBuilder sb = new StringBuilder();
        BufferedReader reader = request.getReader();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        jsonData = sb.toString();
    }

    // At this point, jsonData contains the JSON data from GET or POST request
    // You can now process this JSON data as needed for your application

    // Example: simply output the jsonData for demonstration purposes
    //out.println(jsonData);
	
	// Simple in-memory queue for storing JSON requests
	List<String> requestQueue = (List<String>) application.getAttribute("requestQueue");
	if (requestQueue == null) {
		requestQueue = new ArrayList<>();
		application.setAttribute("requestQueue", requestQueue);
	}

	String func = request.getParameter("func");
	if ("runServerInBrowser".equals(func)) {
		// Return all queued requests as JSON array and clear the queue
		response.setContentType("application/json");
		out.println(new Gson().toJson(requestQueue));
		requestQueue.clear();
	} else {
		// Assume JSON POST, add to queue
		StringBuilder jsonInput = new StringBuilder();
		String line;
		BufferedReader reader = request.getReader();
		while ((line = reader.readLine()) != null) {
			jsonInput.append(line);
		}
		requestQueue.add(jsonInput.toString());

		// Placeholder response until real response is ready
		synchronized (requestQueue) {
			requestQueue.wait(); // Wait for response from browser tab
		}
		// Retrieve and send the real response
		String jsonResponse = (String) application.getAttribute("jsonResponse");
		out.println(jsonResponse);
	}
	*/
%>