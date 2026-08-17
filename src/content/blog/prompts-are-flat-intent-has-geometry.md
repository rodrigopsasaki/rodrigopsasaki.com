---
title: 'Prompts Are Flat. Intent Has Geometry.'
description: "Caps lock is a volume knob that doesn't exist, and a persona is a label that doesn't unpack. Both are compressions of a structure we never had a way to write down."
date: "2026-08-16"
tags: ["ai", "prompting", "context", "agents", "preston"]
author: "Rodrigo Sasaki"
visibility: "published"
---

A conversation I saw recently, lightly paraphrased:

<div class="essay-chat" role="group" aria-label="A conversation about agent instructions">
  <div class="essay-chat__chrome" aria-hidden="true">
    <span></span><span></span><span></span>
  </div>
  <div class="essay-chat__messages">
    <div class="essay-chat__message essay-chat__message--received" aria-label="Received message">
      <p class="essay-chat__text">I wrote <strong>“ALWAYS RUN TESTS FIRST!”</strong> and my agent keeps skipping it on occasion.</p>
    </div>
    <div class="essay-chat__message essay-chat__message--sent" aria-label="Sent message">
      <p class="essay-chat__text">Have you tried increasing the font?</p>
    </div>
  </div>
</div>

It reads like a joke. It isn't, quite.

One of [Preston's](https://preston.bot/) beta testers had a prompt with a line very much like that in it. I've written lines like that myself. Most people who work with agents every day have a file somewhere with at least one sentence shouting at nobody.

Three of them show up constantly:

<div class="essay-prompt-quotes" aria-label="Common prompt instructions">
  <blockquote class="essay-prompt-quote"><p>ALWAYS RUN TESTS</p></blockquote>
  <blockquote class="essay-prompt-quote"><p>NEVER DELETE ANYTHING</p></blockquote>
  <blockquote class="essay-prompt-quote"><p>You are a Senior Software Engineer.</p></blockquote>
</div>

They look like three different kinds of instruction. They're the same mistake wearing three coats.

## The volume knob that doesn't exist

Start with the first two, because they're the obvious ones.

When you write a rule in capitals, you're not confused about grammar. You're trying to express **weight**. Keep that in mind as you read through this.

That's a legitimate intention. It's also being expressed through the only channel available, which is the same undifferentiated prose that carries everything else. That channel is the prompt. Capitals are what's left when you want a volume knob and the interface doesn't have one.

Here's why it under-delivers. Your rule was written in a general moment, calmly (or not), in the abstract. But then it gets read in a specific one: inside a task, with a repo, a diff, a failing pipeline, a user waiting. At that moment your sentence is one thumb on a scale against the entire world the agent is being asked to understand, weigh, and act inside. Sometimes the thumb wins. Sometimes it doesn't, and you don't find out why.

So the joke's suggestion is exactly right in spirit. If you had font size, you'd use it. Really important things get really big, everything else trickles down.

Which is when the second problem shows up, and it's a little bit worse.

## Font size is a scalar

Say you got the feature. Every rule in your prompt now has a size value you can apply to it.

What would be the biggest?

Security? Perhaps maintainability? Maybe both? Or runtime aliveness instead? If security and aliveness are in direct conflict, if push comes to shove and the safe move is to take the system down, which would be its own catastrophe, which font size wins? Also, can two smaller ones gang up? Does maintainability *plus* aliveness sum to outweigh security, the way weights do?

![A SECURITY bar dressed as a guard challenges a taller bar made from MAINTAINABILITY and ALIVENESS stacked together, saying "FITE ME."](/images/have-you-tried-increasing-the-font-bars-v2.webp)

The question is absurd the moment you ask it out loud, and it's absurd for a precise reason: **the structure isn't a scalar.**[^incommensurable] You can't project it onto one axis without losing meaningful information that would help the agent understand what you actually wanted to express when you selected those values.

Preston holds what I called an "override axiom" that says: *if the system is not running, nothing else matters until it is.* I don't express it as font size 999. If it were a number, some sufficiently large pile of other concerns could out-vote it, and that's exactly the outcome that rule exists to prevent. It isn't a weight at all. It's an **interrupt**. It doesn't queue behind the other principles waiting its turn. It pre-empts them.

Some concerns really are weights. Cost, latency, clarity, and convenience can often be traded at the margin. Assigning importance is not the problem. Assuming every kind of importance has the same shape is.

Engineers already have the intuition for this, we just don't apply it here. An exception isn't a high-priority return value. Operator precedence isn't a ranking of how much you like each operator. A scalar can only ever express *"more"*. Real decision structures need *"instead of"*, *"unless"*, *"only when"*, and *"never mind everything else, do this first"*.

Font size can't say any of that. Neither can capitals. Neither can bold, or three exclamation marks, or writing IMPORTANT: at the front, or all the other things we've tried.

## The label that doesn't unpack

Now the third one, which is the one people don't file under the same problem.

> You are a Senior Software Engineer.

What does that actually do?

Mechanically, it steers the model toward a region of its training distribution, the part where text correlates with senior-software-engineer-shaped writing. It's a real, observable effect. It's why the sentence seems to work, and why everyone keeps writing it.

It is _useful_. The mistake is confusing a useful direction with a specification.

Okay, you want a senior engineer, but *which*? What values do they hold? How do they choose between two acceptable options? What do they do when the tests are slow and the deploy is urgent? Do they have impostor syndrome?

There is no "most seniorest possible engineer" sitting at the far end of that gradient, waiting to be summoned. There's a cloud, and you've gestured at it.

Two consequences fall out of this, and both carry their own type of risk.

**You imported everything correlated with the phrase, not just the parts you wanted.** A register. A posture toward legacy code. Opinions about testing that may not be yours. You did get an answer to "which engineer?" You just didn't choose it, and you can't inspect it.

**And it isn't pinned.** That region moves when the model changes. Your prompt is byte-identical and your behavior isn't. We are people who would never ship `"lodash": "*"` into production, shipping `"engineer": "senior"` and calling it a system prompt. Upgrading the model has become a behavior migration you cannot diff.

So the persona is the same failure as the capitals, one level up. Capitals compress a **priority structure** into a single dimension. A persona compresses a **disposition structure** into a single label. In both cases the thing destroyed is the same: not the parts, but the relations between them.

A persona can be a useful prior. It cannot be a contract. It tells the model which cloud to reach toward, not which point you meant, and certainly not why.

## "Just write an eval"

I know. For anything that genuinely matters, stop prompting and start checking. Deterministic gates beat persuasion every time, and if you can write the check you should write the check.

That's right, but it's not globally applicable without a lot of groundwork.

Some rules are easy to gate. *Tests must pass before merge* is a CI job. *Never delete without a backup* is a permission boundary. If you're negotiating with a model about either of those, the problem is in the pipeline, not the prompt.

Then there's this one:

> Never allow two sources of truth for the same entity.

Can you write that eval deterministically in your system today?

You'd need to know what counts as an entity here, which of two stores is authoritative, whether the second one is a cache (fine), a projection (fine), a migration in flight (fine, for now), or a genuine second owner (not fine). The rule is real, potentially fundamental, and violated slowly, by well-intentioned changes, none of which look wrong in isolation.

You could ask another model to judge it. But now the judge has to infer what counts as an entity, authority, or temporary duplication from the same missing structure. The unspoken judgment has moved, not disappeared.

That's the residue. Everything that can be checked should be checked. What's left over is exactly the class of thing we currently express by shouting.

Some of that residue can become mechanical once we name it precisely enough. The point is not that it must remain mysterious. The point is that until we name the relations, the model reconstructs them afresh inside every task.

## Context is not a bag

Which brings up the word everyone uses and nobody defines the same way.

Today, context capability is usually expressed by **volume**. How big is the window, how many tokens, what did you stuff into it. Context engineering as a packing problem: get the right things in, keep the wrong things out, watch the budget.

That model is fine for capacity planning and useless for this, because it can't represent the thing that actually goes wrong.

A bag can contain two things that fight. What it cannot represent is the fight itself.

Context is not just a collection. It is a space with a **geometry**. Statements support, constrain, override, qualify, and invalidate one another. Those relations determine which conclusions are reachable and which should be impossible. Put the same statements in a different structure and you have changed the context, even if the token count and every individual sentence stays exactly the same.

Two statements in your context don't need to reference each other to interact. *"Ship fast, we're in a trial"* and *"never leave a migration half-finished"* are statements about different subjects. They may sit in different files and may never appear in the same sentence. They also cannot both fully govern the same decision. Somewhere in the middle of a task, something has to give, and neither statement contains any information about which.

The forces are real, they're invisible, and they don't announce themselves. The space between the statements is part of the context too. Today we mostly leave that space blank and ask the model to fill it.

## The dangerous part

This is the part where our inability to express these forces bites back.

When two parts of your context pull against each other, the model does not usually stop. Unless we have built a reason for it to halt, it does not flag the conflict, refuse the task, or ask which one you meant.

It produces a confident synthesis. It is not trying to confuse you. The prompt simply omitted the structure that would have exposed its assumptions as wrong. *"When in doubt, ask me"* does not fire when the model is certain.

Humans do this all the time. We are enlightened and blinded by our vantage point at the same time. Nobody can hold two perspectives with one fixed set of eyes.

In other words: this is not quite the model misbehaving. We gave it a shape with pieces missing and asked it to complete the pattern. Completion is what it does. The problem is that it invents the missing geometry at the same time as the answer, then shows us only the answer.

You get a fluent, plausible, well-structured response that quietly picked a side. It didn't tell you because it didn't know it mattered. Fluency becomes our proxy for the model's confidence because we have no instrument to validate it. **You get smoothness exactly where you should get a question.**

A wrong answer looks wrong. A resolved tension looks like an answer.

That's why "it keeps skipping it on occasion" is such a maddening bug report. It isn't random. Something in the context outweighed your rule, in that specific moment, for reasons nobody recorded and nobody can walk backwards through. The occasion *is* the information, and it's the one thing you never get to see.

## What we actually want

Not a bigger font. Not a better adjective in front of "engineer."

We want to say which things are weights and which are interrupts. We want to say what a rule is for, so a model can tell a real exception from a violation. We want conflicts to surface as conflicts instead of dissolving into prose. We want to be able to ask, afterwards, *why did you decide it that way*, and get an answer that walks.

In other words: we don't want to describe the conclusion louder. We want to hand over the structure that produces conclusions.

That does not eliminate judgment, and it does not need to pin every task to one deterministic answer. It makes the judgment visible. Humans can author it, inspect it, ratify it, and revise it instead of asking a model to exercise it invisibly on their behalf.

An LLM will always fill the space we leave for it to fill. The claim is that the space has a geometry we can use. Give the model an undifferentiated bag and it can improvise almost any bridge between the pieces. Give it a skeleton, with the supports, joints, limits, and load-bearing bones made explicit, and the only coherent completion is a body of that species.

The generative part still matters. We are not trying to specify the body down to every hair. We are making sure the model does not silently decide where the bones go.

I've written before that a belief is [something you are presently willing to reason *from*](/blog/a-document-cannot-be-the-belief/). That's the shape of what's missing here, arriving from the other direction. Prompts state conclusions. The thing we keep failing to transmit is the structure underneath them: what supports what, what outranks what, what invalidates what, and what is allowed to interrupt everything else.

Caps lock is what that looks like when you have no other way to say it.

## Notes and further reading

[^incommensurable]: [*Incommensurable Values*, Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/value-incommensurable/). Two things are incommensurable when there is no single unit that measures both. That is the precise version of what goes wrong with font size: security and uptime are not small and large amounts of one substance, so any number you assign is inventing a common currency that doesn't exist. The entry is also careful about something I am not claiming: incommensurable is not the same as incomparable. You can still decide. What you cannot do is decide it with arithmetic.
