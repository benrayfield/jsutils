// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Ben F Rayfield
//
// Made with the help of GPT-5.5-Pro. Try it in browser console copy/paste.
//
// VoteAllowBan_0001.js
// Open-source / Apache-2.0 demo by Ben F Rayfield.
// Intended URL:
// https://github.com/benrayfield/jsutils/blob/master/src/voteAllowBan/VoteAllowBan_0001.js
//
// Proposal:
// Vote normally for ONE candidate.
// Also ALLOW or BAN as many candidates as you want.
// Only candidates with allows>bans can win.
// Of those remaining, whoever gets the most votes wins.
//
// This is toy demo data, not polling, not a prediction, not endorsement.
//
// c means candidate.
// n means name.
// p means party.

firstPastThePostScorer = c=>c.votes;
voteAllowBanScorer = c=>c.votes*Math.max(0,Math.min(c.allows-c.bans,1));
Scorer = voteAllowBanScorer;

Winner = (scorer,candidates)=>candidates.reduce((bestSoFar,next)=>scorer(next)>scorer(bestSoFar)?next:bestSoFar);


// Democrat, sorted by votes.

gavinNewsom = {n:'Gavin Newsom',p:'Dem',votes:27,allows:43,bans:56};
firstPastThePostScorer(gavinNewsom); // 27
voteAllowBanScorer(gavinNewsom); // 0

kamalaHarris = {n:'Kamala Harris',p:'Dem',votes:21,allows:42,bans:55};
firstPastThePostScorer(kamalaHarris); // 21
voteAllowBanScorer(kamalaHarris); // 0

peteButtigieg = {n:'Pete B',p:'Dem',votes:19,allows:52,bans:47};
firstPastThePostScorer(peteButtigieg); // 19
voteAllowBanScorer(peteButtigieg); // 19

alexandriaOcasioCortez = {n:'AOC',p:'Dem',votes:16,allows:37,bans:58};
firstPastThePostScorer(alexandriaOcasioCortez); // 16
voteAllowBanScorer(alexandriaOcasioCortez); // 0

jonOssoff = {n:'Jon Ossoff',p:'Dem',votes:13,allows:52,bans:45};
firstPastThePostScorer(jonOssoff); // 13
voteAllowBanScorer(jonOssoff); // 13

joshShapiro = {n:'Josh Shapiro',p:'Dem',votes:11,allows:55,bans:42};
firstPastThePostScorer(joshShapiro); // 11
voteAllowBanScorer(joshShapiro); // 11

Winner(firstPastThePostScorer,[
	gavinNewsom,kamalaHarris,peteButtigieg,
	alexandriaOcasioCortez,jonOssoff,joshShapiro
]); // {n:'Gavin Newsom',p:'Dem',votes:27,allows:43,bans:56}

Winner(voteAllowBanScorer,[
	gavinNewsom,kamalaHarris,peteButtigieg,
	alexandriaOcasioCortez,jonOssoff,joshShapiro
]); // {n:'Pete B',p:'Dem',votes:19,allows:52,bans:47}


// Green, sorted by votes.

jillStein = {n:'Jill Stein',p:'Grn',votes:2,allows:36,bans:45};
firstPastThePostScorer(jillStein); // 2
voteAllowBanScorer(jillStein); // 0

butchWare = {n:'Butch Ware',p:'Grn',votes:1,allows:20,bans:12};
firstPastThePostScorer(butchWare); // 1
voteAllowBanScorer(butchWare); // 1

Winner(firstPastThePostScorer,[
	jillStein,butchWare
]); // {n:'Jill Stein',p:'Grn',votes:2,allows:36,bans:45}

Winner(voteAllowBanScorer,[
	jillStein,butchWare
]); // {n:'Butch Ware',p:'Grn',votes:1,allows:20,bans:12}


// Independent, sorted by votes.

rfkJr = {n:'RFK Jr',p:'Ind',votes:5,allows:35,bans:57};
firstPastThePostScorer(rfkJr); // 5
voteAllowBanScorer(rfkJr); // 0

andrewYang = {n:'Andrew Yang',p:'Ind',votes:2,allows:46,bans:37};
firstPastThePostScorer(andrewYang); // 2
voteAllowBanScorer(andrewYang); // 2

cornelWest = {n:'Cornel West',p:'Ind',votes:1,allows:22,bans:31};
firstPastThePostScorer(cornelWest); // 1
voteAllowBanScorer(cornelWest); // 0

Winner(firstPastThePostScorer,[
	rfkJr,andrewYang,cornelWest
]); // {n:'RFK Jr',p:'Ind',votes:5,allows:35,bans:57}

Winner(voteAllowBanScorer,[
	rfkJr,andrewYang,cornelWest
]); // {n:'Andrew Yang',p:'Ind',votes:2,allows:46,bans:37}


// Libertarian, sorted by votes.

chaseOliver = {n:'Chase Oliver',p:'Lib',votes:3,allows:47,bans:28};
firstPastThePostScorer(chaseOliver); // 3
voteAllowBanScorer(chaseOliver); // 3

michaelRectenwald = {n:'M Rectenwald',p:'Lib',votes:2,allows:23,bans:28};
firstPastThePostScorer(michaelRectenwald); // 2
voteAllowBanScorer(michaelRectenwald); // 0

Winner(firstPastThePostScorer,[
	chaseOliver,michaelRectenwald
]); // {n:'Chase Oliver',p:'Lib',votes:3,allows:47,bans:28}

Winner(voteAllowBanScorer,[
	chaseOliver,michaelRectenwald
]); // {n:'Chase Oliver',p:'Lib',votes:3,allows:47,bans:28}


// Republican, sorted by votes.

jdVance = {n:'JD Vance',p:'Rep',votes:29,allows:39,bans:55};
firstPastThePostScorer(jdVance); // 29
voteAllowBanScorer(jdVance); // 0

marcoRubio = {n:'Marco Rubio',p:'Rep',votes:24,allows:51,bans:47};
firstPastThePostScorer(marcoRubio); // 24
voteAllowBanScorer(marcoRubio); // 24

ronDeSantis = {n:'Ron DeSantis',p:'Rep',votes:14,allows:40,bans:54};
firstPastThePostScorer(ronDeSantis); // 14
voteAllowBanScorer(ronDeSantis); // 0

nikkiHaley = {n:'Nikki Haley',p:'Rep',votes:12,allows:50,bans:46};
firstPastThePostScorer(nikkiHaley); // 12
voteAllowBanScorer(nikkiHaley); // 12

randPaul = {n:'Rand Paul',p:'Rep',votes:8,allows:48,bans:45};
firstPastThePostScorer(randPaul); // 8
voteAllowBanScorer(randPaul); // 8

thomasMassie = {n:'Thomas Massie',p:'Rep',votes:6,allows:48,bans:43};
firstPastThePostScorer(thomasMassie); // 6
voteAllowBanScorer(thomasMassie); // 6

Winner(firstPastThePostScorer,[
	jdVance,marcoRubio,ronDeSantis,
	nikkiHaley,randPaul,thomasMassie
]); // {n:'JD Vance',p:'Rep',votes:29,allows:39,bans:55}

Winner(voteAllowBanScorer,[
	jdVance,marcoRubio,ronDeSantis,
	nikkiHaley,randPaul,thomasMassie
]); // {n:'Marco Rubio',p:'Rep',votes:24,allows:51,bans:47}


// All candidates, ascending by firstPastThePostScorer.

Winner(firstPastThePostScorer,[
	{n:'Butch Ware',p:'Grn',votes:1,allows:20,bans:12}, // 1
	{n:'Cornel West',p:'Ind',votes:1,allows:22,bans:31}, // 1
	{n:'Andrew Yang',p:'Ind',votes:2,allows:46,bans:37}, // 2
	{n:'Jill Stein',p:'Grn',votes:2,allows:36,bans:45}, // 2
	{n:'M Rectenwald',p:'Lib',votes:2,allows:23,bans:28}, // 2
	{n:'Chase Oliver',p:'Lib',votes:3,allows:47,bans:28}, // 3
	{n:'RFK Jr',p:'Ind',votes:5,allows:35,bans:57}, // 5
	{n:'Thomas Massie',p:'Rep',votes:6,allows:48,bans:43}, // 6
	{n:'Rand Paul',p:'Rep',votes:8,allows:48,bans:45}, // 8
	{n:'Josh Shapiro',p:'Dem',votes:11,allows:55,bans:42}, // 11
	{n:'Nikki Haley',p:'Rep',votes:12,allows:50,bans:46}, // 12
	{n:'Jon Ossoff',p:'Dem',votes:13,allows:52,bans:45}, // 13
	{n:'Ron DeSantis',p:'Rep',votes:14,allows:40,bans:54}, // 14
	{n:'AOC',p:'Dem',votes:16,allows:37,bans:58}, // 16
	{n:'Pete B',p:'Dem',votes:19,allows:52,bans:47}, // 19
	{n:'Kamala Harris',p:'Dem',votes:21,allows:42,bans:55}, // 21
	{n:'Marco Rubio',p:'Rep',votes:24,allows:51,bans:47}, // 24
	{n:'Gavin Newsom',p:'Dem',votes:27,allows:43,bans:56}, // 27
	{n:'JD Vance',p:'Rep',votes:29,allows:39,bans:55} // 29
]);
// {n:'JD Vance',p:'Rep',votes:29,allows:39,bans:55}


// All candidates, ascending by voteAllowBanScorer.

Winner(voteAllowBanScorer,[
	// high bans: Green spoiler concerns.
	{n:'Jill Stein',p:'Grn',votes:2,allows:36,bans:45}, // 0

	// high bans: less known Libertarian candidate.
	{n:'M Rectenwald',p:'Lib',votes:2,allows:23,bans:28}, // 0

	// high bans: vaccine/COVID fights.
	{n:'RFK Jr',p:'Ind',votes:5,allows:35,bans:57}, // 0

	// high bans: left-wing plus spoiler concerns.
	{n:'Cornel West',p:'Ind',votes:1,allows:22,bans:31}, // 0

	// high bans: culture-war governor image.
	{n:'Ron DeSantis',p:'Rep',votes:14,allows:40,bans:54}, // 0

	// high bans: socialist/progressive label.
	{n:'AOC',p:'Dem',votes:16,allows:37,bans:58}, // 0

	// high bans: prior loss plus admin baggage.
	{n:'Kamala Harris',p:'Dem',votes:21,allows:42,bans:55}, // 0

	// high bans: California record plus culture-war image.
	{n:'Gavin Newsom',p:'Dem',votes:27,allows:43,bans:56}, // 0

	// high bans: Trump-heir plus anti-MAGA backlash.
	{n:'JD Vance',p:'Rep',votes:29,allows:39,bans:55}, // 0

	{n:'Butch Ware',p:'Grn',votes:1,allows:20,bans:12}, // 1
	{n:'Andrew Yang',p:'Ind',votes:2,allows:46,bans:37}, // 2
	{n:'Chase Oliver',p:'Lib',votes:3,allows:47,bans:28}, // 3
	{n:'Thomas Massie',p:'Rep',votes:6,allows:48,bans:43}, // 6
	{n:'Rand Paul',p:'Rep',votes:8,allows:48,bans:45}, // 8
	{n:'Josh Shapiro',p:'Dem',votes:11,allows:55,bans:42}, // 11
	{n:'Nikki Haley',p:'Rep',votes:12,allows:50,bans:46}, // 12
	{n:'Jon Ossoff',p:'Dem',votes:13,allows:52,bans:45}, // 13
	{n:'Pete B',p:'Dem',votes:19,allows:52,bans:47}, // 19
	{n:'Marco Rubio',p:'Rep',votes:24,allows:51,bans:47} // 24
]);
// {n:'Marco Rubio',p:'Rep',votes:24,allows:51,bans:47}


/*
Analysis:

First-past-the-post ignores allows and bans.
In this demo, JD Vance wins because he has the most VOTE marks.

Vote/Allow/Ban first checks acceptability.
Candidates with bans>=allows get score 0.
In this demo, JD Vance and Gavin Newsom both have many votes,
but both are disqualified by too many BAN marks.

Marco Rubio wins Vote/Allow/Ban here because he has the most
ordinary votes among candidates with allows>bans.

Thomas Massie:
- firstPastThePostScorer gives him 6.
- voteAllowBanScorer also gives him 6.
- he is allowed, but not close to winning in this demo.

Chase Oliver is also allowed, but only has 3 votes.
That shows the system does not magically make third parties win.
It only stops candidates with more bans than allows from winning.

Pros of first-past-the-post:
- Very simple.
- Easy to count.
- Strong advantage for the biggest 2 parties.
- Good for candidates who can win a plurality even if disliked.

Cons of first-past-the-post:
- Can elect someone most voters would reject.
- Pressures voters into lesser-evil voting.
- Makes third-party votes feel wasted.
- Lets vote splitting decide the winner.

Pros of Vote/Allow/Ban:
- Still simple: one normal vote, plus allow/ban circles.
- One-shot paper ballot; no ranked-choice rounds.
- Lets voters say "I can live with this person."
- Lets voters say "I reject this person."
- Lets voters mass-ban politicians they dislike.
- Partially fixes the third-party spoiler problem.
- Makes low-approval plurality winners harder.

Cons of Vote/Allow/Ban:
- BAN can be used strategically against frontrunners.
- A famous candidate may attract more bans than a quiet one.
- Needs a rule for ties.
- Needs a rule if everyone gets score 0.
- It measures expressed approval, not all-voter approval,
  because blanks are ignored.

Who would tend to prefer first-past-the-post:
- The 2 major parties.
- Front-runners.
- Candidates with intense bases and high opposition.
- Campaigns that benefit from "vote for us or they win."

Who would tend to prefer Vote/Allow/Ban:
- Voters who dislike both major-party nominees.
- Third-party and independent voters.
- Less polarizing candidates.
- Voters who want to block low-approval winners.
- People who want a simpler reform than ranked-choice voting.

This is not the best possible voting system.
It is a simple proposed upgrade to plurality voting.

Its political sales pitch is:
"Why should candidates with more bans than allows be allowed to win?"
*/