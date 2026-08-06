---
title: "What happens when you give an expert system from the 80s an LLM?"
description: "Expert systems starved at the input form, not in the reasoner. The machine that remembered why has spent forty years waiting for something that can read."
date: "2026-08-06"
tags: ["ai", "expert systems", "truth maintenance", "inference", "knowledge graphs", "preston"]
author: "Rodrigo Sasaki"
visibility: "published"
---

For most of this post, I want you to forget about the second half of the title.

I want to tell you about a machine from the eighties.

## The machine that was promised

In the early eighties, serious companies made serious bets on a simple idea: what an expert knows can be written down as rules, and a machine can reason over those rules.

Digital Equipment Corporation ran one in production. XCON took a customer's VAX order and configured it: which components were compatible, what was missing, how the cabinets should be laid out.[^r1] By the mid-eighties it had grown to thousands of rules and touched most of the orders the company shipped. This was not a demo. It was line-of-business software with a rule base where its brain should be.

The architecture behind systems like XCON had two halves, and the names are worth stating plainly because they were chosen carefully. There was a **knowledge base**: the rules, the facts, everything the organization had managed to say. And there was an **inference engine**: the part that chained rules together to reach conclusions. The separation was the whole point. You could grow what the system knew without rewriting how it reasoned.

Hold onto that shape for a moment. Two halves. Knowledge on one side, reasoning on the other.

## A machine that remembers why

The same era produced a quieter idea, one layer down.

If a system is going to reason over knowledge for years, it cannot only record its conclusions. It has to record why it is entitled to them. A conclusion whose reasons are gone is not knowledge. It is residue.

A truth-maintenance system, or TMS, maintains a set of beliefs and the justifications that allow those beliefs to stand.[^doyle]

The word _truth_ makes this sound grander than it is. The system does not possess truth. It is not an oracle. It keeps track of which propositions are currently supported under the information it has.

You give it claims:

> `C1`: Tweety is a bird.

> `C2`: Birds normally fly.

And you give it relationships:

> `C1` and `C2` support `C3`: Tweety flies.

If those grounds stand, `C3` can stand. Other claims can then depend on `C3`. The system can walk left to explain _because_, and right to explain _therefore_.

It is a small graph, but it already does something a document cannot do on its own. It knows which conclusion depends on which reason.

## Standing is not truth

The TMS needs a more careful vocabulary than true and false.

A claim can have **standing** because its current justifications hold. It can lose standing because one of those justifications was withdrawn. It can remain present as history even when the system is no longer willing to reason from it.

Most importantly, a missing claim is not a negative claim.

That distinction sounds academic until you put it in a domain the eighties actually cared about. MYCIN, the famous medical expert system of the era, recommended antibiotic therapy. A system in that position has to live with the difference between:

> The patient's record contains no penicillin allergy.

and

> The patient is not allergic to penicillin.

The first sentence describes the record. The second describes the patient. A system that collapses them will eventually reason its way into a prescription that hurts someone. Absence of a claim is not a claim of absence.[^de-kleer]

The negative claim has to arrive on its own, with its own evidence. It might immediately contradict other standing claims. That contradiction is information too, and it should not be flattened into whichever sentence arrived most recently.

Uncertainty, absence, contradiction, and retraction remain different things. That discipline is most of what a TMS is.

## A new claim does not arrive with its edges

Go back to Tweety. The small graph stands: Tweety is a bird, birds normally fly, Tweety flies.

Then a new claim arrives:

> `C4`: Tweety is a penguin.

What should the TMS do with it?

By itself, nothing.

The sentence does not arrive carrying the edges that make it meaningful. Someone still has to establish that a penguin is a bird, that penguins are exceptions to the default that birds fly, and that this exception defeats the support for `C3`.[^tweety]

![A new claim about Tweety creates candidate semantic questions that a human or domain reasoner must answer before the TMS can propagate the result.](/assets/tms-inference/tweety-asks-for-edges.svg)

The blue arrows are already part of the graph. The gold arrows are not. They are questions about what relationship, if any, the new claim has to what the system already believes.

The purple arrows are deliberately different. They are not claims about Tweety. They point to decisions _about the graph itself_: moments where a person, a domain model, or some other interpreter must say which semantic edge deserves to exist.

**Propagation requires no judgment once every relevant node and edge exists. Establishing them is where all the judgment lives.**

## The settled graph

Suppose someone answers the questions.

A penguin is a bird, so the new claim supports `C1` rather than competing with it. Penguins are an exception to the default, and the exception defeats the support for `C3`. The edges are ratified, and the machine does the rest.

![The settled Tweety graph: the penguin claim is committed as an exception that defeats the default, the belief that Tweety flies loses standing but remains as history, and a revised conclusion stands in its place.](/assets/tms-inference/tweety-settled.svg)

Notice what the graph did _not_ do. It deleted nothing. `C3` is still there, with its history, marked as no longer supported. If Tweety turns out to be a cartoon penguin who flies after all, the machine knows exactly which decision to revisit.

This is belief revision as bookkeeping, and I mean that as a compliment. The machine is not being creative. It is being extremely consistent about remembering what depended on what.[^de-kleer]

## Now replace the contents of the nodes

Here is the part I actually want to show you.

Keep the arrows exactly where they are. Keep every type, every edge, every rule about standing and support. Change nothing but the text inside the nodes.

![The same settled graph with different node contents: a service makes outbound HTTP requests, the team convention routes them through the shared client, a streaming endpoint is ratified as an exception that defeats the convention, and a narrower conclusion stands in its place.](/assets/tms-inference/same-graph-different-world.svg)

It is the same graph.

"Tweety is a bird" became _this service makes outbound HTTP requests_. "Birds normally fly" became _outbound requests go through the shared client_ — a convention, which is to say, a default. "Tweety flies" became the conclusion every reviewer silently draws: _this service uses the shared client_.

And "Tweety is a penguin" became the pull request that imports `axios` directly.

The sentence arrives with no edges, exactly as before. Maybe this service is a legitimate exception. Maybe the author did not know the convention existed. Maybe the convention itself needs revising. Someone has to establish what the observation means to what already stands.

Suppose the team decides that streaming is a legitimate exception, because the shared client buffers responses. That decision is the penguin edge. The convention is not erased. It is superseded by a narrower claim — outbound requests go through the shared client _unless they require streaming_ — and everything that depended on the broader version can be reconsidered. Mechanically. The machine from the last section does not know or care that we changed domains.

Your codebase is full of Tweetys. Every convention is a default. Every exception is a penguin. Every pull request is a new claim asking what it means to the graph your team carries around in its heads.

## The impossible input form

So why did none of this survive?

If truth maintenance is this good at remembering why — and it is; the machinery is decades old and deterministic — why is it not underneath every system that claims to remember what an organization knows?

Look at what I just did in both examples.

I handed the machine perfectly formed propositions. I gave every relevant thing a stable identity: I decided that "shared client", `HttpClient`, and `@company/http` refer to the same concept. I supplied the scope of every rule: which services it applies to, why a test fixture does not count as a violation. I classified every relationship: this claim supports that one, this observation defeats that default, this decision supersedes that rule while preserving two of its grounds. And I decided what deserves authority: a convention ratified by the team outweighs a pattern inferred from three files.

The TMS discovered none of that. It received a world that had already been translated into exactly the language it needed.

In the eighties, that translation was a profession. The person was called a **knowledge engineer**, and the job was to sit with experts, extract what they knew, and hand-encode it as rules the machine could chain. XCON's rule base needed a permanent team just to keep up with DEC's own product line. And the field had a name for the reason this could not scale. Feigenbaum called it the **knowledge acquisition bottleneck**: the machine could reason over anything, but only a human could feed it, one hand-translated proposition at a time.[^feigenbaum]

And starve it did. Real organizations do not produce neat propositions and typed justification edges. They produce code, comments, ADRs, tickets, incidents, pull-request discussions, Slack messages, and sentences spoken over coffee. The same decision appears differently in each place: as a direct instruction in a review, as the absence of a library in the code, as the reason one service lacked tracing in an incident report. Meaning is not contained in syntax. Two identical lines can mean different things in different repositories, and two different implementations can express the same decision.

The old machine's real limitation was not that it could not maintain beliefs.

It could not read.

## The missing piece

Now remember the second half of the title.

We have machines that read now. They tolerate ordinary language. They can compare meanings, resolve references, and recognize that two differently worded statements express the same rule. They can do it cheaply, repeatedly, and at a scale no team of knowledge engineers could ever sustain.

And we have a word for running one of them. The industry settled on it years ago, without any sense of history.

We call it **inference**.

The word spent the eighties attached to the half of the architecture that turned out to be easy: the deterministic chaining of rules that already existed. Then it migrated. It came back meaning a forward pass through a model, and it landed, with uncanny precision, on exactly the half the old machine was missing.

Everything that follows is a consequence of that one fact.

## The questions are small

Watch what the translation actually requires. Not essays. Not architecture documents. Questions like:

> Does this module use `date-fns`?

There isn't a coding agent in the world that cannot answer that. It is too simple to be interesting, and that is the whole point.

Some of these questions fall below even that bar. `grep` answers the one above without a model in sight, and that is not a weakness of the idea. Every question that can be answered without inference is inference you get to save. But the economics are not the point here.

Climb one rung: _does this module hand-roll date arithmetic where the codebase's convention is `date-fns`?_ Now you need a reader. Another rung: _do these two differently worded statements express the same rule?_ Now you need a reader with judgment. One more: _is this observation an exception to the convention, or evidence against it?_

That last one is the penguin question.

Every rung of this ladder sits comfortably below what today's models do casually. None of them requires the machine to hold the organization's truth in its head. Each is small enough to be asked, answered, and checked.

The knowledge acquisition bottleneck was never that a single judgment was hard. It was that there were millions of them, and they never stopped arriving. The bottleneck was volume and vigilance, not difficulty.

## Small answers can be held accountable

If the questions are that small, the answers can be checked.

An answer to a small question does not have to be trusted prose. It can enter the graph the way any claim does: with provenance. What was asked, what evidence was looked at, when, and by what. A proposal that two statements refer to the same thing is preserved as a correctable claim, not executed as a silent merge. If the answer is wrong, it can be challenged and retracted like anything else. The discipline from the first half of this post already knows how.

## The model never composes

If every answer is a checked claim, the model never has to be trusted with the whole.

This is the click I most want you to feel, because it is where the obvious objection dies. The objection: language models hallucinate, so a memory built on one will rot. But the model in this architecture is never asked to be right about the organization. It is asked to be right about the tiny thing in front of it, one question at a time. When it is wrong, the wrongness is a node — inspectable, challengeable, retractable — not a corruption smeared through a context window.

Composition is not its job. Standing, support, contradiction, retraction, propagation: those belong to the deterministic half, and the deterministic half has been ready since 1977. The new machine does not replace the old one. It feeds it.

## Change becomes bookkeeping

If the model never composes, change stops being frightening.

Remove the `date-fns` import and the claim that depended on it loses its ground. Ratify a narrower convention and the broader one is superseded, its dependents queued for reconsideration. You have already seen this movie. It is the settled Tweety graph, walked forward, with no judgment required — that was the bolded sentence from the first half of this post.

The expensive act, the one that needed a profession, was translation. Translation is now abundant. What remains scarce is judgment: which proposed claim deserves authority, which tension a human must resolve. And that is exactly the scarce thing this architecture spends humans on.

## Why I am telling you this

I wrote before that [a document cannot be the belief](/blog/a-document-cannot-be-the-belief/). A document preserves what someone was ready to say. The belief is the current permission to reason from it, and it lives in a structure with reasons, dependents, and standing.

This post is the other half of that argument. The structure is not hypothetical, and I did not invent it. It was designed, built, and proven decades ago, then shelved — not because the reasoning failed, but because nothing could feed it. It starved at the input form.

So the title is not really a thought experiment. It is a build plan, and it is the one I am following with [Preston](https://preston.bot). Take the machine that remembers why. Put the machine that reads at its boundary. Let humans keep the only job that was ever truly theirs: deciding what deserves to be believed.

## Notes and further reading

[^r1]: [*R1: A Rule-Based Configurer of Computer Systems*, John McDermott](https://www.sciencedirect.com/science/article/abs/pii/0004370282900212). R1 was the research name; inside Digital Equipment Corporation the deployed system was called XCON. McDermott's account is worth reading for how unglamorous the reasoning is: at each step the system "simply recognizes what to do." The intelligence lived in the rule base, which is exactly where the maintenance burden landed.

[^doyle]: [*A Truth Maintenance System*, Jon Doyle](https://www.csc2.ncsu.edu/faculty/jdoyle2/publications/ijcai77.pdf). Doyle's framing is useful because a TMS does not merely store conclusions. It records their justifications and uses those justifications to determine which beliefs currently belong in the maintained set.

[^de-kleer]: [*An Assumption-Based TMS*, Johan de Kleer](https://www.dekleer.org/Publications/An%20Assumption-Based%20TMS.pdf). De Kleer's assumption-based formulation makes the important distinction between a proposition being supported under a set of assumptions and being universally true. It is also where the difference between not believing `P` and believing `not-P` becomes structurally unavoidable.

[^tweety]: [*Tweety--Still Flying: Some Remarks on Abnormal Birds and Default Reasoning*, Ray Reiter and Giovanni Criscuolo](https://cdn.aaai.org/AAAI/1986/AAAI86-002.pdf). Tweety is not the canonical example of truth-maintenance systems specifically, but it became a durable way to explain the adjacent problem of revising a default when a more specific fact arrives.

[^feigenbaum]: [*The Art of Artificial Intelligence: Themes and Case Studies of Knowledge Engineering*, Edward Feigenbaum](https://stacks.stanford.edu/file/druid:bg342cm2034/bg342cm2034.pdf). The IJCAI 1977 lecture that laid out knowledge engineering as a practice and named its central constraint: knowledge acquisition is the bottleneck. Feigenbaum diagnosed precisely what would starve these systems, a decade before it did.
