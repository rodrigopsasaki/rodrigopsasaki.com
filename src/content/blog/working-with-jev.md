---
title: 'Working with Jev'
description: 'What changed when I put a judge-like AI with a fixed answer sheet inside a real system.'
date: '2026-09-18'
tags: ['ai', 'software design', 'experiments', 'jev', 'preston']
author: 'Rodrigo Sasaki'
visibility: 'published'
---

A couple of days ago a friend sent me the news about the release of a new model. Jev by TypeSafe AI. I read up on it, and it seemed to be exactly what I needed in something I was working on. I requested an early access key and they gave me one. I've spent the last day putting Jev into [Preston](https://preston.bot/), the aforementioned AI system I've been building to review changes to software, this post is a collection of notes I made when working with it, and a mental model I created that even helped me decide where and how to use it.

Think of Jev as a judge. Like those monarchs of old that had a list of people coming to them to decide on something. People state their cases, both sides can speak, and a verdict is given. Judge Jev sort of works like that, but with a twist. You bring it a case, give it the facts, tell it what question is being decided, and define the verdicts it is allowed to return. Then it rules. When I mean the actual tool rather than judges in general.

The big difference here being that Jev needs to know what verdicts are possible. It can't invent a "better" one on the spot.

For years, the basic AI pattern available to most of us has looked roughly like this:

```text
give model some background context
  → explain what we want
  → ask it to think
  → go back and forth a few times
  → maybe use some tools
  → figure out what it all meant
```

Sometimes that is exactly what we need. But Preston also contains many decisions that conceptually look like this:

```typescript
if (await contradicts(claimA, claimB)) {
  // I know exactly what to do here.
}
```

Read that code as: if these two [claims](/blog/a-document-cannot-be-the-belief/#a-document-can-contain-a-claim) contradict each other. In other words, if they cannot both be true, do the next thing. The problem is that `contradicts()` isn't a function I can honestly write with ordinary rules.

This is where Judge Jev gets interesting. It gives me something remarkably close to a **`semantic if`**. A normal `if` branches on something exact, such as whether a number is greater than ten. A `semantic if` branches on meaning. I supply what contradiction means, the facts to consider, and what the software should do with yes or no. Judge Jev handles the fuzzy boundary in the middle. Essentially, they gave a type system to semantic questions.

This is now possible with the real interface:

```typescript
async function contradicts(judge: TypedJudge, claimA: string, claimB: string) {
  const questions: Questions = {
    relation: {
      type: 'choice',
      instructions: 'Decide how these two claims relate.',
      criteria: {
        contradicts: 'They cannot both be true at the same time.',
        compatible: 'They can both be true at the same time.',
      },
    },
  };

  const outcome = await judge.judge({
    state: { claimA, claimB },
    questions,
    deadlineMs: 10_000,
  });

  const ruling = judged(outcome, 'relation', 'choice', 0.8);
  if (ruling.kind !== 'accepted') return false;
  return ruling.answer.choice === 'contradicts';
}
```

## Bring a case

[Jev](https://typesafe.ai/) is a judgment model. Unlike a chat model, it does not write an answer in whatever words it chooses. I give it facts, a question, and a fixed answer sheet. It returns an answer in a predictable shape that software can use. That last property is what programmers mean here by _typed_.

In judge terms, that gives us three parts:

- **State** is the case file: the facts before the court.
- **Questions and criteria** are what the court must decide and the written definitions it should use.
- **Noul, Choice, or Score** is the answer sheet: the verdicts Judge Jev is permitted to return.

The names are specific to Jev, but the ideas are familiar. `Noul` is a yes or no question. `Choice` means pick one option from a list I provide. `Score` means choose a level on a scale whose levels I define. For Choice and Score, Judge Jev also reports how strongly it leaned toward every available answer.

<figure class="jev-primitives" aria-labelledby="jev-primitives-caption">
  <div class="jev-primitive jev-primitive--noul">
    <div class="jev-primitive__head">
      <strong>Noul</strong>
      <span>yes or no</span>
    </div>
    <p class="jev-primitive__question">Is Tweety a bird?</p>
    <div class="jev-verdict-row">
      <span>yes</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--winner" style="width: 96%"></span></span>
      <span>.96</span>
    </div>
    <div class="jev-verdict-row">
      <span>no</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill" style="width: 4%"></span></span>
      <span>.04</span>
    </div>
    <div class="jev-primitive__foot">probability of yes</div>
  </div>
  <div class="jev-primitive jev-primitive--choice">
    <div class="jev-primitive__head">
      <strong>Choice</strong>
      <span>one from a list</span>
    </div>
    <p class="jev-primitive__question">What kind of bird is Tweety?</p>
    <div class="jev-verdict-row">
      <span>penguin</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--winner" style="width: 88%"></span></span>
      <span>.88</span>
    </div>
    <div class="jev-verdict-row">
      <span>duck</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill" style="width: 8%"></span></span>
      <span>.08</span>
    </div>
    <div class="jev-verdict-row">
      <span>owl</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill" style="width: 4%"></span></span>
      <span>.04</span>
    </div>
    <div class="jev-primitive__foot">label + distribution</div>
  </div>
  <div class="jev-primitive jev-primitive--score">
    <div class="jev-primitive__head">
      <strong>Score</strong>
      <span>one level on a scale</span>
    </div>
    <p class="jev-primitive__question">How well can Tweety fly?</p>
    <div class="jev-verdict-row">
      <span>0 · cannot</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--winner" style="width: 94%"></span></span>
      <span>.94</span>
    </div>
    <div class="jev-verdict-row">
      <span>1 · briefly</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill" style="width: 5%"></span></span>
      <span>.05</span>
    </div>
    <div class="jev-verdict-row">
      <span>2 · well</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill" style="width: 1%"></span></span>
      <span>.01</span>
    </div>
    <div class="jev-primitive__foot">level + distribution</div>
  </div>
  <figcaption id="jev-primitives-caption">Three question shapes, using the same little penguin.</figcaption>
</figure>

The shape matters more than the names. I do not ask Judge Jev to discover what kind of answer would be useful and then explain it. I decide the possible answers first. That restriction felt small until I started moving real decisions into it, at which point it became the important part of the interface.

We've gotten very good at handing badly shaped questions to large chat models and relying on their intelligence to compensate for our imprecision. A chat model can reinterpret the request, add a caveat, propose a better framing, or quietly answer a slightly different question. A judge cannot fix the law you handed it, which makes a poorly defined decision much harder to overlook.

## The ruling is a distribution

Judge Jev does not return only the winning answer. For Choice and Score questions, it returns every possible answer with a number showing how much support it placed there. That full set of numbers is called a _distribution_.

My first instinct was to read the winner and throw the rest away. Suppose I give Judge Jev three possible verdicts:

- guilty
- not guilty
- wrong court

Read the weights as if ten jurors had divided their votes among those three verdicts:

<figure class="jev-distributions" aria-labelledby="jev-distributions-caption">
  <div class="jev-distribution">
    <div class="jev-distribution__head">
      <span>jury A</span>
      <strong>clear preference</strong>
    </div>
    <div class="jev-verdict-row">
      <span>guilty</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--winner" style="width: 90%"></span></span>
      <span>9</span>
    </div>
    <div class="jev-verdict-row">
      <span>not guilty</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill" style="width: 10%"></span></span>
      <span>1</span>
    </div>
    <div class="jev-verdict-row">
      <span>wrong court</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--zero" style="width: 0%"></span></span>
      <span>0</span>
    </div>
  </div>
  <div class="jev-distribution">
    <div class="jev-distribution__head">
      <span>jury B</span>
      <strong>evenly split</strong>
    </div>
    <div class="jev-verdict-row">
      <span>guilty</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--winner" style="width: 50%"></span></span>
      <span>5</span>
    </div>
    <div class="jev-verdict-row">
      <span>not guilty</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--dissent" style="width: 50%"></span></span>
      <span>5</span>
    </div>
    <div class="jev-verdict-row">
      <span>wrong court</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--zero" style="width: 0%"></span></span>
      <span>0</span>
    </div>
  </div>
  <div class="jev-distribution">
    <div class="jev-distribution__head">
      <span>jury C</span>
      <strong>three-way split</strong>
    </div>
    <div class="jev-verdict-row">
      <span>guilty</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--winner" style="width: 40%"></span></span>
      <span>4</span>
    </div>
    <div class="jev-verdict-row">
      <span>not guilty</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--dissent" style="width: 30%"></span></span>
      <span>3</span>
    </div>
    <div class="jev-verdict-row">
      <span>wrong court</span>
      <span class="jev-verdict-track"><span class="jev-verdict-fill" style="width: 30%"></span></span>
      <span>3</span>
    </div>
  </div>
  <div class="jev-jury-questions">
    <div>
      <span>the distribution answers</span>
      <strong>How did the jury divide?</strong>
    </div>
    <div>
      <span>it does not answer</span>
      <strong>What actually happened?</strong>
    </div>
  </div>
  <figcaption id="jev-distributions-caption">Ten votes, one fixed answer sheet, three very different distributions.</figcaption>
</figure>

Jury A is 9-1-0. Jury B is 5-5-0. Jury C is 4-3-3. They represent very different levels of agreement, even though every jury received the same possible answers.

Judge Jev does not literally convene ten people, but jury votes are a useful translation of the weights. They answer “How was the judgment distributed across the possible verdicts?” They do not answer “Which verdict is true?” Those are different questions, and confusing them makes the winning number look like evidence it cannot provide.

For Choice and Score answers, Jev calls the concentration of those weights _confidence_. In jury terms, it describes how united or divided the jury is. It does not tell me whether the jury reached the correct verdict. Judge Jev gives me the distribution; only testing against cases with known answers can tell me how often rulings like it are right.

<p class="jev-thesis">Decisive does not mean correct.</p>

A unanimous jury can be wrong. A confident judge can rule from bad law or an incomplete case file. If I see `confidence: 0.8`, my programmer brain desperately wants to translate it into “80% chance the answer is correct.” It does not mean that because it answers the distribution question, not the truth question.

Judge Jev handles a yes or no Noul question a little differently. The number is simply the share of its support placed on yes, with the rest placed on no.

<figure class="jev-noul" aria-labelledby="jev-noul-caption">
  <div class="jev-noul__head"><span>noul</span><strong>Does the evidence support the claim?</strong></div>
  <div class="jev-verdict-row">
    <span>yes</span>
    <span class="jev-verdict-track"><span class="jev-verdict-fill jev-verdict-fill--winner" style="width: 91%"></span></span>
    <span>.91</span>
  </div>
  <div class="jev-verdict-row">
    <span>no</span>
    <span class="jev-verdict-track"><span class="jev-verdict-fill" style="width: 9%"></span></span>
    <span>.09</span>
  </div>
  <figcaption id="jev-noul-caption">Judge Jev placed 91% of its support behind yes, using these facts and definitions.</figcaption>
</figure>

But `.91` does not prove that claims receiving `.91` will be correct 91% of the time. Only repeated testing against cases with known answers could establish that.

<p class="jev-thesis jev-thesis--amber">You learn what the numbers mean for your question by measuring them.</p>

## A floor is not a grade

Okay, so Judge Jev can tell me how strongly it leaned toward an answer. That's pretty useful... right?
It is, but it also gives you a slightly nastier problem to solve: **how high does confidence need to be before an answer is good enough?**

In other words, how do I know if I should trust it? The answer depends on what I am going to do with it. Quick example: Blood type.

There are two familiar ways to find out someone's blood type. You can ask them, or a lab can test a blood sample. Neither is better in the abstract. Which one is better depends on what you need the answer for.

If it comes up in conversation, asking is better. It is immediate, free, and probably good enough. Stopping the conversation until a lab responds would be absurd. Before a transfusion, the calculation changes completely. The cost of being wrong overwhelms the cost of testing, so only the test will do.

A confidence floor is that kind of rule. It is a cutoff set by my software. Above it, the software accepts Judge Jev's answer. Below it, the case goes somewhere else, such as a safer rule, another process, or a person.

I started with a floor of `0.8`. That looked comfortably cautious until I used the same cutoff for different kinds of questions and they behaved like different instruments.

In my small sample about whether two claims might contradict each other, every answer accepted above the floor was correct, but only 38.8% of answers made it that far. Questions about whether evidence supported a citation behaved differently at the same cutoff. In another question with seven possible kinds of relationship, 68% of cases fell below `0.8`, and one answer never won at all.

Those were small experiments on my workload, not general Jev results. They do not show that `0.8` is good or bad. They show that a cutoff is meaningless unless I also say what kind of question it governs and what happens when the answer is wrong. A confidence floor is closer to a standard of proof than a grade. A standard that works for one kind of case may reject too much, or trust too much, in another. I now treat each floor as a sorting rule that I have measured for one particular kind of question.

The measurements I care about look more like this:

- Of the answers I accept, how many are right? This is called _precision_.
- How many cases get accepted instead of sent elsewhere? This is called _coverage_.
- Which answers does Judge Jev confuse with one another?
- Are there options that never win?
- When a case is near the cutoff, is there a close second answer?
- What changes when I alter the facts or the definitions?

A judge that sends 40% of cases elsewhere but is extremely reliable on the rest may be useful, provided the software knows what to do with those rejected cases. It is also important not to call agreement with Preston's old chat-model process “accuracy.” That process is another judge, not the law. To measure accuracy I need cases with known answers: an answer key, not another opinion.

## When a verdict never wins

The question with seven possible relationships produced one of my favorite failures of the day: one option never won. Maybe Judge Jev was bad at recognizing it. Or maybe I thought I had seven distinct ideas and the judge effectively told me, “Cute. You have six.”

The missing winner was a clue, not a diagnosis. To learn what was happening, I stopped asking one seven-way Choice and asked separate yes or no questions about each relationship. One of the clearest boundaries this exposed was between two of my labels:

- `converge` meant that both conventions make the same choice.
- `restrain` meant that both deliberately omit the same thing.

Those sound different until the shared choice is to omit something.

<figure class="jev-overlap" aria-labelledby="jev-overlap-caption">
  <div class="jev-overlap__sheet">
    <div>
      <span>the original answer sheet</span>
      <strong>Pick exactly one relationship</strong>
    </div>
    <div class="jev-overlap__labels">
      <div class="jev-overlap__primary-labels">
        <span class="jev-overlap__label jev-overlap__label--converge">converge</span>
        <span>diverge</span>
        <span>oppose</span>
        <span>depend</span>
        <span>specialize</span>
        <span class="jev-overlap__label jev-overlap__label--restrain">restrain</span>
      </div>
      <div class="jev-overlap__fallback">
        <span>if no relationship fits</span>
        <b>none</b>
      </div>
    </div>
  </div>
  <div class="jev-overlap__pair">
    <span>one pair used to probe the boundary</span>
    <div>
      <p><b>A</b> The client library adds no retry logic.</p>
      <p><b>B</b> The transport layer adds no retry logic.</p>
    </div>
  </div>
  <div class="jev-overlap__checks">
    <div class="jev-overlap__check jev-overlap__check--converge">
      <span>ask separately</span>
      <strong>Do they make the same choice?</strong>
      <b>yes · converge</b>
    </div>
    <div class="jev-overlap__check jev-overlap__check--restrain">
      <span>ask separately</span>
      <strong>Do they deliberately omit the same thing?</strong>
      <b>yes · restrain</b>
    </div>
  </div>
  <div class="jev-overlap__finding">
    <span>what the diagnostic revealed</span>
    <strong>These boxes overlap.</strong>
    <p>A shared omission is also a shared choice. Forcing one winner had hidden that fact.</p>
  </div>
  <figcaption id="jev-overlap-caption">The zero-win verdict raised the question. Asking each relationship independently exposed the overlapping definitions.</figcaption>
</figure>

On this pair, the judge was not failing to recognize one of the labels. I had asked it to choose exactly one answer from categories that were not actually mutually exclusive. Once the questions were separated, a single pair could honestly light up both labels. That gave me something concrete to fix: say where each definition stops, decide which one takes precedence when both apply, and keep examples like this in a labeled answer key.

The criteria are definitions, and definitions are law. If two options mean nearly the same thing, Judge Jev will tend to prefer one of them. One label becomes the natural home for cases that I imagined would belong to the other.

This is not ordinary debugging. There may be no broken rule or garbled response to find because the problem is the meaning of the categories themselves. I did not remove human judgment; I gave it named boxes. That is still valuable because I can record the definitions, test them, compare versions, and connect the result to ordinary software rules. But tidy boxes do not relieve me of deciding whether the model, the subject matter, and the application can actually tell them apart.

## Judge Jev does not investigate

A judge rules on the cases brought before it. It does not roam the city looking for crimes. This became the cleanest way for me to separate finding possible cases from judging them.

If Preston contains hundreds of claims and I want to know whether a new one contradicts any of them, I should not ask Judge Jev to search the whole collection and judge contradiction at the same time. Those are different jobs with different ways to fail. I can find likely candidates first, then bring those cases to Judge Jev.

The same rule applies to the facts I include. **The state is the case file.** A model may be able to read a great deal of text at once, but that is not permission to wheel the entire warehouse into the courtroom.

I learned this in an embarrassingly literal way. One stage of Preston had 21 statements to compare with the same collection of roughly 205 entries. Each statement went out carrying its own copy of the collection. Every request used about 22,000 of the 28,000 small pieces of text the model could read at once.

In effect, we were photocopying the statute book for every defendant. The requests ran at the same time, which hid how wasteful the arrangement was. Grouping the work more carefully took that stage from roughly 19.4 seconds to 8.7 seconds. Without Judge Jev, the same stage took 6.7 seconds. The full process fell from 204 seconds to 177 seconds, compared with 206 seconds when Judge Jev was switched off.

Those are observations from one workload, not general Jev performance numbers. Even after the improvement, Preston still made 21 requests and repeated the same facts in each one. Running them together removed most of the visible wait, but it did not remove the duplicated work. The measurement mostly exposed what I should improve next.

The broader speed difference was still hard to ignore. In an earlier experiment that identified the fields of knowledge used in a software project, a stage that had made 102 chat calls over roughly 600 seconds became 17 Judge Jev requests in roughly 2.5 seconds. It also noticed a field that the old approach had missed in every project I tested.

Again, that is one stage in my system. It is not a vendor benchmark. What it showed me was that once a problem really is judge-shaped, the amount of machinery needed to answer it can collapse.

## Claims compose, and close calls matter

I have been using the word _claim_ without slowing down to define it. Here, a claim is simply a sentence that can be true or false and that the system may need to compare with another sentence. It need not be grand or philosophical. `Tweety is a bird` is a claim.

Now give the system a second claim and ask how the two fit together. Three common relationships look like this:

This is the question I left open when I wrote that [a new claim does not arrive with its edges](/blog/what-happens-when-you-give-an-expert-system-an-llm/#a-new-claim-does-not-arrive-with-its-edges). The relationship is not a fact hidden inside either sentence. It is another judgment that has to be made.

<figure class="jev-claim-map" aria-labelledby="jev-claim-map-caption">
  <div class="jev-claim-map__base">
    <span>base claim</span>
    <strong>Tweety is a bird.</strong>
  </div>
  <div class="jev-claim-map__relations">
    <div class="jev-claim-map__relation jev-claim-map__relation--corroborates">
      <span>corroborates</span>
      <strong>The zoo's record says Tweety is a bird.</strong>
      <p>Another source supports the same proposition.</p>
    </div>
    <div class="jev-claim-map__relation jev-claim-map__relation--refines">
      <span>refines</span>
      <strong>Tweety is a penguin.</strong>
      <p>Because penguins are birds, this adds detail without undoing the base claim.</p>
    </div>
    <div class="jev-claim-map__relation jev-claim-map__relation--contradicts">
      <span>contradicts</span>
      <strong>Tweety is not a bird.</strong>
      <p>The two claims cannot both hold in the same scope and at the same time.</p>
    </div>
  </div>
  <figcaption id="jev-claim-map-caption">The relation belongs to a pair of claims. It is not a property hidden inside either sentence alone.</figcaption>
</figure>

Direction and wording matter. `Tweety is a penguin` refines `Tweety is a bird` because it is more specific. In the other direction, the bird claim is broader and loses detail. Small words matter too. `Birds typically fly` can coexist with `Tweety cannot fly` because _typically_ allows exceptions. Change the first claim to `All birds fly` and the pair is now in conflict. My definitions have to say which of these relationships the application cares about.

I did not start Preston with this vocabulary arranged neatly either. I had been treating “related” as sufficient until the system needed to combine claims rather than merely retrieve similar passages. Naming the relationship is what lets later software decide whether to add support, preserve a more specific statement, or open a conflict.

With that in place, Judge Jev's numbers have something concrete to attach to. Preston is comparing two claims and asking which relationship best describes the pair:

```text
corroborates  .51
refines       .46
contradicts   .03
```

The ruling is `corroborates`, but `refines` almost won. That runner-up is the dissent. It tells me that the second claim may both support the first and add detail, and that my definitions or my example sit near the boundary between those ideas. A next step that is safe for either relationship might proceed, while one that makes sense only for `corroborates` should wait. This may also be exactly the kind of case I should add to an answer key for the next round of testing.

The full set of numbers lets the software keep uncertainty instead of hiding it. I do not need to ask a chat model to write a paragraph about how uncertain it feels and then ask another tool what the paragraph meant. That may be my favorite property of the whole interface.

## The model judges. Software governs.

Once Judge Jev sends a ruling back, the rest of the application should decide what happens. The model supplies judgment; it does not get to quietly decide how much uncertainty is acceptable, whether to try again, when to ask for help, or which real-world actions are safe.

Those policies belong in ordinary, predictable software. The court owns its procedure. Judge Jev answers the question before it.

### For programmers: making the rule hard to skip

The first version in Preston was a small helper that checked whether an answer cleared the confidence floor:

```typescript
export function acceptAtFloor<A extends ConfidentAnswer>(
  answer: A,
  floor: number
): FloorOutcome<A> {
  if (answer.confidence === null || answer.confidence < floor) {
    return { kind: 'below-floor', confidence: answer.confidence };
  }
  return { kind: 'accepted', answer };
}
```

That works only if every programmer remembers to use it. Someone can still read the answer directly and forget the check. I wanted the software itself to make that mistake difficult.

The current version gathers every outcome, including no answer, refusal, below the floor, and acceptance, into one result. Only an accepted answer receives the `Floored` type, which acts like a stamp saying that the answer passed the required check.

```typescript
declare const FLOORED_BRAND: unique symbol;

export type Floored<A> = A & {
  readonly [FLOORED_BRAND]: true;
};
```

Actual Preston code now uses a Choice answer like this:

```typescript
const continuity = judged(outcome, 'continuity', 'choice', floor);

if (continuity.kind === 'accepted' && continuity.answer.choice === 'continues') {
  // Only a floor-gated answer can reach this branch.
}
```

In plain language, an unchecked answer and a checked answer are different things in the program. Skipping the standard of proof becomes a mistake the programming tools can catch, rather than a rule I hope everyone remembers. This is what I mean by “the model judges; software governs.”

## Know what is not a ruling

The judge metaphor also tells me when Judge Jev is the wrong tool. The useful distinction is whether I am asking for a ruling inside a decision I have already shaped, or asking the model to discover what the decision should be.

<figure class="jev-shapes" aria-labelledby="jev-shapes-caption">
  <div class="jev-shapes__panel jev-shapes__panel--ruling">
    <div class="jev-shapes__head">
      <span class="jev-shapes__mark" aria-hidden="true">✓</span>
      <div>
        <strong>Judge-shaped</strong>
        <span>Good fit for Judge Jev: the case and possible verdicts already exist.</span>
      </div>
    </div>
    <div class="jev-shapes__item">
      <span>categorize</span>
      <p>Which of these known genres best describes this book?</p>
      <code>pick from a list</code>
    </div>
    <div class="jev-shapes__item">
      <span>compare</span>
      <p>Does “Tweety is a bird” conflict with “Tweety is not a bird”?</p>
      <code>yes or no</code>
    </div>
    <div class="jev-shapes__item">
      <span>choose</span>
      <p>Which of these proposed explanations best fits the evidence?</p>
      <code>pick from a list</code>
    </div>
    <div class="jev-shapes__item">
      <span>prioritize</span>
      <p>Which of these known risks should we investigate first?</p>
      <code>pick from a list</code>
    </div>
  </div>
  <div class="jev-shapes__panel jev-shapes__panel--open">
    <div class="jev-shapes__head">
      <span class="jev-shapes__mark" aria-hidden="true">?</span>
      <div>
        <strong>Not judge-shaped</strong>
        <span>The model would have to invent part of the case or the answer sheet.</span>
      </div>
    </div>
    <div class="jev-shapes__item">
      <span>discover categories</span>
      <p>What kind of book is this?</p>
      <code>make the list first</code>
    </div>
    <div class="jev-shapes__item">
      <span>find candidates</span>
      <p>What conflicts with “Tweety is a bird”?</p>
      <code>search first</code>
    </div>
    <div class="jev-shapes__item">
      <span>form an explanation</span>
      <p>What happened here?</p>
      <code>build the answer</code>
    </div>
    <div class="jev-shapes__item">
      <span>set the agenda</span>
      <p>What should we investigate next?</p>
      <code>propose the next move</code>
    </div>
  </div>
  <figcaption id="jev-shapes-caption">A ruling selects within a defined decision. Discovery has to define the decision first.</figcaption>
</figure>

A judge decides charges brought before it; it does not decide what charges should exist. Judge Jev is useful when a decision requires an understanding of meaning but I already know what the possible answers are. If I am still asking the model to discover the question, the categories, or the useful next action, I am doing a different kind of work. That work is real, but forcing it into a verdict hides the part I have not defined yet.

## A neat answer can hide a vague question

There is a more subtle trap here. Judge Jev always returns a neat answer, but neatness can create the illusion that the question itself was good.

Imagine that software is choosing which AI model should handle a task. It asks Judge Jev for three scores:

```json
{
  "difficulty": 0.9,
  "reasoningNeed": 0.95,
  "ambiguity": 0.8
}
```

Judge Jev may be perfectly capable of producing those values, but tidy numbers do not make the ideas behind them clear. What is `reasoningNeed`? What does `ambiguity: 0` mean? Does no ambiguity exist, or did the judge simply fail to notice it? What should the software do when both reasoning need and ambiguity are high?

Sometimes reasoning resolves ambiguity. Sometimes information is missing and no amount of reasoning can recover it. Sometimes a question appears unambiguous because one of its premises is false. The clean output shape makes those questions more visible, not less.

This is the same missing structure I meant by [intent having geometry](/blog/prompts-are-flat-intent-has-geometry/#context-is-not-a-bag). The labels are present, but the relationships that give them operational meaning are still underspecified.

<p class="jev-thesis">Constraining the answer does not make the question correct.</p>

Jev gives us an unusually clean tool for machine judgment. Precisely because the output is so tidy, weaknesses in the surrounding definitions become difficult to ignore. We still have to decide which facts belong in the case, which question the software can act on, what answers are possible, what Judge Jev's numbers mean after testing, and when the thing we are asking is not a ruling at all.

## Semantic `if`s are here

For years we've mostly used AI in one basic pattern:

```text
give model some stuff
  → ask it to think
  → get more stuff
```

We've gotten very good at this, perhaps good enough that we routinely hand models vaguely defined problems and rely on their intelligence to compensate for the fact that we have not actually decided what question we are asking.

Judge Jev makes a narrower offer. Sometimes I already know the question, which answers are meaningful, and what my software will do with each one. The missing piece is a decision about meaning that I cannot write as an exact rule. That is where I want the judge.

```typescript
if (evidenceActuallySupports(claim)) { ... }

if (requirementsAreMeaningfullyIncompatible(a, b)) { ... }

if (changeViolates(statedPrinciple)) { ... }

if (incidentsDescribeTheSameFailure(a, b)) { ... }

if (exceptionMateriallyChanges(rule)) { ... }
```

In each example, ordinary software knows what to do with yes or no. It just cannot determine the answer by comparing exact values. That is what I mean by a semantic `if`.

These decisions are becoming cheap enough to use inside ordinary software. We have been putting general chat-model calls into these gaps because language models could cross them, but crossing a gap and defining it are different problems. Judge Jev makes that distinction visible because it will also rule on a bad question, choose decisively between answers that mean nearly the same thing, or answer confidently from the wrong facts. It gives me the boundary I asked for, which means the work of defining that boundary still belongs to me.

After a day of working with Jev, I've become less interested in asking how many places I can put it. The question I keep coming back to is:

> How many decisions in my system can I define well enough that all I need from a model is the ruling?

Which leads to another:

> What do people who are really good at defining decisions build when semantic `if`s become cheap?

I don't know yet, and that is the part I want to watch.
