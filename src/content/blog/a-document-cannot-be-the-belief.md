---
title: "A document cannot be the belief"
description: "Writing a decision down preserves the words. The reasons behind it, and everything that depends on them, still live in people's heads."
date: "2026-08-03"
tags: ["engineering", "knowledge", "truth maintenance", "software design", "ai", "preston"]
author: "Rodrigo Sasaki"
visibility: "published"
---

Before we start, please bear with me for a moment, because I want to be unusually precise about an ordinary word I used in the title: _belief_. There is a reason.

Belief is one of those things we all instinctively understand, but that becomes very hard to define when someone asks. A belief is not merely a sentence you agree with. It is something you are presently willing to reason _from_.[^belief] _From_ is the operative word here, because it makes the belief a starting point for future decisions.

If I believe that a service is stateless, I may conclude that any instance can handle the next request. If a product team believes that a trial should measure actual product use, that belief should influence when billing starts, when lifecycle emails are sent, and how conversion is measured. Beliefs have consequences.

They also have reasons. I might believe the service is stateless because I have seen where it stores state, because its architecture says so, or because somebody who owns it told me. The product team might believe the trial should measure actual use because charging people for time before they can access the product would be unfair.

Those reasons matter because beliefs can change. If I discover that the service keeps sessions in memory, I should no longer reason from statelessness in the same way. If enterprise onboarding separates account creation from product access, the team may need to reconsider when a trial really begins.

So when I say that a team _believes_ something, I do not mean that every person privately agrees with the same sentence. I mean that the team currently permits that understanding to guide decisions made in its name.

Hold onto that definition for a moment.

## What you had to reconstruct

New engineers often describe their first months at a company in the same terms.

It can be pretty exhausting. Simple changes carry an uncomfortable amount of uncertainty. The code can be read, everything is essentially there, but it's still difficult to know what matters. A solution may be locally correct and still feel dangerous because there are reasons behind the surrounding system that have not become visible yet. The test suite can be all green and you're still not sure if a deployment is safe.

Three months later, much of that feeling is gone.

The system is still the same. It evolved a little, sure, but it's still mostly the same system. The documentation probably did not become dramatically better. The engineer just happens to "get" more of it now.

In other words, they reconstructed enough of what the organization believes to work with confidence.

They learned which boundaries are there on purpose. Which inconsistencies are migrations rather than mistakes. Which apparently arbitrary constraint protects a real business concern. Which parts of the code are old but tolerated, and which patterns the team would refuse to reproduce.

No single artifact taught them this. They assembled it from code, documents, reviews, conversations, corrections, incidents, and the reactions of people who had already assembled it themselves.

This "map" that is built is a graph. And graphs are all the rage right now, I know, but there's actually a good reason for it. It's not merely a fashionable choice of storage.

Understanding is relational. One thing is believed _because_ of another. One conclusion _allows_ the next. Two individually reasonable claims can pull in opposite directions. A new observation can change an old conclusion without changing most of what supported it.

There is no natural first page or final paragraph for that structure. It has neighborhoods, dependencies, conflicts, and consequences. When people try to preserve those relationships instead of flattening them into an artifact, a graph is the shape that emerges. It's simply what you end up with.

That is what the new engineer formed: not only a map of what they learned, but of which conclusions the team reasons from, what supports them, and what they allow. There's also another layer formed at the intersections of what this individual believes is good engineering and the team's beliefs, but that's a conversation I'll leave for another post.

Then something subtle happens. Once this context becomes obvious, they start writing the same kind of compressed artifacts that were initially hostile to them, and they are not doing anything wrong. That's how communication works, compression is what makes it possible to begin with. But reconstruction is the price paid by everyone who did not already share the writer’s understanding.

Once that graph becomes familiar, it becomes the lens through which they decide what needs explaining. The context they omit no longer looks omitted because it feels obvious from inside the lens.

The experience feels like learning the system. Much of it is actually learning what the organization believes about the system.

Which raises the question: Why are we not modeling _that_?

## One decision, many materializations

Consider a company offering a seven-day free trial.

The team has a simple rule:

> A free trial begins when an account is created.

The rule is written down, but the document is only one place where it lives.

Billing calculates an expiration date from account creation. Lifecycle emails use the same timestamp. Analytics defines its conversion window around it. Support explains remaining trial time. Tests encode the expected dates. Engineers use the rule when reviewing new work.

![One business decision supports billing, lifecycle messaging, analytics, support, tests, and future engineering judgments.](/assets/document-meaning/projection.svg)

_The decision is singular. Its consequences are distributed._

Everything visible in this image is pretty commonplace really. We know decisions materialize in many places. We know changing one can require code, tests, dashboards, documentation, and communication.

But the image is missing its left side.

The decision did not appear from nowhere.

## The hidden half

The team did not choose account creation arbitrarily. But the missing left side is not a bag of facts that all point directly at the trial rule. It is another chain of decisions.

The product team believes users should reach a usable product with as little friction as possible. In the original self-serve flow, that leads to a decision:

> Creating an account grants access immediately.

Separately, the financial model allows the company to fund only seven days of actual product use. That leads to another decision:

> The trial clock begins when usable access begins.

Those two decisions compose into the rule the rest of the company sees:

> A free trial begins when an account is created.

![Product intent and a financial constraint support two smaller decisions. Those decisions compose into the visible trial rule, which then supports consequences throughout the company.](/assets/document-meaning/grounding.svg)

_A decision is the point at which reasons become consequences._

This is the structure that usually lives in people’s minds instead of in the artifacts.

“Account creation grants immediate access” is not merely an observation. It is already a product decision, [grounded](https://preston.bot/docs/grounding) in the desire to remove friction. But one decision’s consequence can become another decision’s reason. Walk left and it exists _because_ of the product value. Walk right and it _therefore_ determines when the trial begins.

A good decision record may preserve some of this. It may say that the company can fund only seven days, or that the trial should measure actual access. That is useful.

But the artifact still does not become the understanding.

It does not know which other decisions depend on those reasons. It does not know whether “minimize friction” is a local consideration or a durable product value. It does not know that billing’s use of the account timestamp is a consequence of this exact chain rather than an unrelated implementation choice.

The reader reconstructs those connections.

## A tension appears

The company begins selling to larger customers.

Enterprise onboarding introduces a new requirement:

> Sales must be able to create an account before the customer is ready to receive access.

That claim does not directly contradict the trial rule. It conflicts with an earlier decision:

> Creating an account grants access immediately.

Both claims have reasons to exist. They simply cannot govern the same flow at the same time. The conflict between them is a [tension](https://preston.bot/docs/tension), and naming it does not decide which side should win.

A human still has to resolve it.

The team decides that creating an account will reserve the customer and its workspace, while access will begin only when onboarding is complete. The immediate-access decision is [revised](https://preston.bot/docs/revision):

> Account creation records the customer. Workspace activation grants access.

Only then does the change propagate to the trial rule. The separate decision that the trial clock follows usable access never changed. Composed with the revised access boundary, it now produces:

> A free trial begins when the workspace is activated.

This is not an unrelated rule replacing the old one. The downstream decision changed because one of the claims supporting it was superseded.

The desire to minimize friction still has [standing](https://preston.bot/docs/standing). So does the seven-day financial constraint. So does the decision to measure the trial from usable access. The organization preserved all of that and revised the smallest part that could no longer hold.[^belief-revision]

![An enterprise onboarding requirement creates a tension with immediate access at account creation. A human revision changes the access boundary, which then revises the trial rule and marks its consequences for reconsideration.](/assets/document-meaning/ground-shift.svg)

_The new claim did not jump straight to the visible rule. It challenged **one** of the decisions that produced it._

Now the consequences on the right need attention. Billing, emails, analytics, support, tests, and future reviews may still reflect the old decision.

The document can be rewritten immediately.

The organization cannot. People still need to discover which parts of their own reconstructed graph the revision should change. Propagation becomes the problem.

## The acknowledgement ritual

Engineering organizations have a familiar process for changing an important decision.

Update the document. Share it in Slack. Explain what changed. Ask the relevant people to read it. Maybe ask them to react with an emoji when they are done.

Once enough people react, the decision is considered communicated.

The reaction proves only that the message reached someone.

It cannot establish that the reader reconstructed the changed reasoning. It cannot identify which of their previous assumptions lost standing. It cannot find the code, tests, dashboards, or pending work that relied on the old decision. That link simply does not exist. It cannot bring the new understanding back six weeks later when a superficially unrelated pull request touches trial emails.

The message usually transports the new conclusion:

> Trials now begin at workspace activation.

What changed in the team’s understanding was:

> Enterprise onboarding requires an account to exist before the customer should have access. Account creation can no longer be the access boundary. Because the trial measures seven days of usable access, its start moves to workspace activation.

That difference matters. The conclusion tells someone _what_ to do. The grounding lets them apply the decision correctly somewhere the original author never anticipated, because it carries the _why_.

We have automated delivery and acknowledgement. We have not automated propagation.

## A document can contain a claim

A team can write down what it believes.

The document cannot _be_ the belief.

The distinction from the beginning should be clearer now. The sentence inside the document is something that can be considered, supported, challenged, or corrected. It is a claim.[^assertion]

Belief is the team’s current stance toward that claim. It means the claim is presently allowed to participate in judgment: people may reason from it, make decisions from it, and expect future work to respect what follows from it.

That stance has reasons. It can acquire or lose standing when those reasons change.[^assumption-tms] It can support other conclusions, and those conclusions should be reconsidered when their support no longer holds.

A document is an expression produced from that state at a particular moment.

This does not make documents less important. Documents are excellent ways to make decisions inspectable, transferable, and open to challenge. Tests establish boundaries. Code provides evidence of actual behavior. Conversations let teams discover things they are not ready to formalize or have no place to put yet.

Now here's the punchline: The mistake is expecting any artifact to maintain the belief that produced it.

Search can retrieve the new document. AI can summarize it. Slack can notify the whole company.

None of those systems knows whether the claim still has standing, why it has standing, or what was allowed to depend on it.

A document can preserve a claim. A belief is the current permission to reason from it.

## Why are we not modeling this?

The structure is not mystical, but it is hard to see at first.

It is made from small claims and explicit relationships between them. Unlike a list, that representation knows that the enterprise requirement creates a tension with the access boundary rather than with the visible trial rule. It knows which decision a human superseded. It knows that the trial policy still stands, and it can walk forward from the revision to find the conclusions that depended on what changed.[^truth-maintenance]

![A typed derivation graph represents claims with standing, grounds, a tension, a human supersession, and forward propagation into revised consequences.](/assets/document-meaning/typed-derivation.svg)

_The prose described the sequence. The graph preserves what each step means to every other step._

Each proposition can be questioned. Each connection can explain why it exists. A human should be able to inspect it and, most importantly, correct any part of it.

When the enterprise requirement arrives, a system should not silently choose a winner or rewrite production code on its own.

It should be able to show which existing claim the requirement conflicts with, preserve both sides of the tension, record the human revision, and identify the downstream judgments that now deserve reconsideration.

The automation finds where human judgment is required. Humans still provide the judgment.

That is a better division of labor than asking every employee to reconstruct and maintain the same graph privately.

The purpose would not be to make humans draw graphs all day. Code, documents, decisions, and conversations already contain the pieces. Humans would still decide which interpretations deserve authority and how genuine tensions should be resolved.

The purpose would be to stop making every human reconstruct the entire thing alone.

A document preserves what someone was ready to say. The understanding behind it explains why they said it and what follows.

We already model the artifacts. Why are we not modeling the thing people spend their first three months rebuilding?

## Notes and further reading

[^belief]: [*Belief*, Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/archives/spr2023/entries/belief/index.html). This is useful because it separates the content of a proposition from the attitude of taking it to be true. That distinction is the hinge of this essay: storing the sentence is not the same thing as maintaining the stance toward it.

[^belief-revision]: [*Logic of Belief Revision*, Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/archives/spr2008/entries/logic-belief-revision/). Belief revision asks how to incorporate new information while giving up as little as necessary. It is the formal relative of what the trial example does: preserve what still stands and revise the smallest part that cannot.

[^assertion]: [*Assertion*, Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/archives/spr2022/entries/assertion/). The discussion of assertion as commitment is especially relevant. A claim enters a public space in which its author can be asked for grounds and other people can become entitled to reason from it. That is much richer than treating a claim as text in a field.

[^assumption-tms]: [*An Assumption-Based TMS*, Johan de Kleer](https://www.dekleer.org/Publications/An%20Assumption-Based%20TMS.pdf). De Kleer models beliefs as supported under explicit sets of assumptions rather than simply true or false. That is relevant to the essay's use of standing: what matters is not only the proposition, but the current support under which a system may reason from it. The paper also contains a distinction that deserves an essay of its own: lacking belief in a claim is not the same as believing its negation.

[^truth-maintenance]: [*A Truth Maintenance System*, Jon Doyle](https://www.csc2.ncsu.edu/faculty/jdoyle2/publications/ijcai77.pdf). Doyle's early TMS work treats recorded justifications as the basis for deciding which beliefs are supported. It supplies the computational move underneath the article: when support changes, belief and its consequences can be reconsidered without erasing the history that made them intelligible.
