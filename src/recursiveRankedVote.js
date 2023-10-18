//Ben F Rayfield offers this code as opensource MIT license.

//2023-10-18 this code has not been tested, might not even compile, but the basic idea of recursive ranked voting is there. TODO.

/*https://twitter.com/benrayfield/status/1714634327462453670
How to do #RankedChoiceVoting at state and country level: Do normal #RankedChoiceVoting in state to choose top candidate.
Remove that candidate and do #RankedChoiceVoting again to choose 2nd place and so on.
Each state gives ranked list of votes in country vote. 3rd party can win
*/


//Each voter is a list. Each state is a listOfLists of all that states voters. Country is a list of states votes, so listOfListOfList.
//Returns the 1 winner.
var twoLevelRankedVote = listOfListsOfLists=>{
	return twoLevelRankedVoteGetList(listOfListsOfLists)[0];
};

//Each voter is a list. Each state is a listOfLists of all that states voters. Country is a list of states votes, so listOfListOfList.
//Returns the the preferences of the whole country as a ranked list, with the top choice being first [0], then second choice [1], then third choice [2], etc.
//You might just use the first choice [0], or keep the others for if the first choice cant do the job anymore, dies or quits the job, etc,
//you automatically use the second choice [1], and so on. Or the first choice could be a pair of president and vice president that together are a single choice as usual.
//Im not telling you how to react to the results of recursive ranked voting, just giving you an algorithm to use ranked voting recursively
//on any lists you want.
var twoLevelRankedVoteGetList = listOfListsOfLists=>recursiveRankedVote(listOfListsOfLists.map(recursiveRankedVote));


//returns a list of choices similar to listOfLists[any],
//so the result of a recursiveRankedVote can be one of the lists in parameter of another recursiveRankedVote,
//which could be used for 2 level ranked voting at state and country level,
//where each state gives a list of ranked choices instead of just their top choice.
//Their top choice is always first in that list. In theory, this should usually give the same winner as 1 level ranked voting
//between voters directly in all the states combined, if it werent for different states having different number of representatives,
//so in theory weighted by numberOfRepresentativesInThatState/numberOfVotersInThatState.
//This should in theory be a better voting system than tanked voting at state level and first-past-the-post voting at country level.
var recursiveRankedVote = listOfLists=>{
	let numChoices = listChoicesInOrderTheyFirstOccur(listOfLists).length;
	let retList = []; //the combined ranked vote from multiple ranked votes, choosing the best choice, then removing it to choose second best, and so on.
	while(true){
		//everything that everyone voted for, once each, and it narrows down to 1 choice by removing the least popular choice each time.
		let choices = listChoicesInOrderTheyFirstOccur(listOfLists);
		if(choices.length == 0){ //have done numChoices number of rankedVote
			if(retList.length != numChoices){
				throw retList.length+' == retList.length != numChoices '+numChoices;
			}
			return retList;
		}
		let bestChoiceByRankedVoting = rankedVote(listOfLists);
		retList.push(bestChoiceByRankedVoting);
		listOfLists = removeChoiceFromLists(listOfLists,bestChoiceByRankedVoting);
	}
	return retList;
};

var rankedVote = listOfLists=>{
	let choices; //everything that everyone voted for, once each, and it narrows down to 1 choice by removing the least popular choice each time.
	do{
		choices = listChoicesInOrderTheyFirstOccur(listOfLists);
		if(choices.length == 0){
			throw 'Nobody voted for anything';
		}
		let worstChoice = whichChoiceGotLeastVotes(listOfLists);
		listOfLists =  removeChoiceFromLists;
	}while(choices.length > 1);
	return choices[0]; //the only choice left
};

var maxListLen = listOfLists=>listOfLists.map(list=>list.length).reduce(Math.max);

//Example: get everyone's 3rd choice vote, or null if they didnt have a third choice. Returns list of those.
var nthChoiceVotesWithNulls = (listOfLists,nthChoice)=>listOfLists.map(list=>list[nthChoice]);

var nthChoiceVotesThatExist = (listOfLists,nthChoice)=>nthChoiceVotesWithNulls(listOfLists,nthChoice).filter(x=>(x!=null));

var numVotes = (map,key)=>(map[key]||0);

var addVote = (map,key)=>{
	map[key] = numVotes(map)+1;
};

var countNthChoiceVotes = (listOfLists,nthChoice)=>{
	let votes = {};
	for(let choice of nthChoiceVotesThatExist(listOfLists(nthChoice))){
		addVote(votes,choice);
	}
	return votes;
};

//returns list of {choiceA: 5, choiceB 3, ...} for first choice {}, second choice {}, and so on. You only need the first choice {} except for tie breaking.
var countAllNthChoiceVotes = listOfLists=>{
	let howManyMaps = maxListLen(listOfLists);
	let maps = [];
	for(let nthChoice=0; nthChoice<howManyMaps; nthChoice++){
		maps[nthChoice] = countNthChoiceVotes(listOfLists,nthChoice);
	}
	return maps;
};

var makeChoiceComparator = listOfLists=>{
	let maps = countAllNthChoiceVotes(listOfLists);
	return function(choiceA, choiceB){
		for(let nth=0; nth<maps.length; nth++){
			let diff = numVotes(maps[nth],choiceA) - numVotes(maps[nth],choiceB);
			if(diff < 0) return -1;
			if(diff > 0) return 1;
			//else break tie by number of second choice votes, then break ties by number of third choice votes, etc.
		}
		return 0; //they tied all the way down to every nth vote, so this comparator does not change their order.
	};
};

var listChoicesInOrderTheyFirstOccur = listOfLists=>{
	let set = new Set();
	let retList = [];
	for(let list of listOfLists){
		for(let choice of list){
			if(!set.hash(choice)){
				set.add(choice);
				retList.push(choice);
			}
		}
	}
	return retList;
};

var whichChoiceGotLeastVotes = listOfLists=>{
	let choices = listChoicesInOrderTheyFirstOccur(listOfLists); //for tie breaking, if comparator doesnt change order of some. Those earlier in the listOfLists win.
	let comparator = makeChoiceComparator(listOfLists);
	choices.sort(comparator); //FIXME should reverse this order? Want whoever got the most votes at index 0, and least votes at choices[choices.length-1].
	return choices[choices.length-1];
};

var removeChoiceFromLists = (listOfLists,removeThisChoice)=>listOfLists.map(list=>list.filter(choice=>choice!=removeThisChoice));



