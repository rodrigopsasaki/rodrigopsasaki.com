---
title: "From a line to an embedding"
description: "Give coffee a taste address, one dimension at a time, and discover what an embedding is for."
date: "2026-10-30"
tags: ["ai", "embeddings", "geometry", "learning"]
author: "Rodrigo Sasaki"
lang: "en"
visibility: "draft"
---

Imagine a café counter. There is orange juice, lemon juice, a black coffee, a latte, and a hazelnut latte.

A customer loved the black coffee and asks you for something else they will enjoy as much. The names tell you a little. The orange juice and the lemon juice share the word juice, and loving one tells you nothing about the other.

What if we could give taste an address? Drinks with something in common could share a neighborhood, and the map could show the similarities that names leave out.

<figure class="ew-plate">
  <a href="/images/embedding-walkthrough/01-cafe-counter.webp" aria-label="Open the café counter illustration at full size">
    <img src="/images/embedding-walkthrough/01-cafe-counter.webp" alt="A painted café counter with five drinks: orange juice, lemon juice, a black coffee, a latte, and a hazelnut latte." width="740" height="520" />
  </a>
  <figcaption>Five drinks. Which ones are alike?</figcaption>
</figure>

## One question, one line

Begin with a single question about each drink: how sweet is it?

Score each drink from 0 to 1. Zero is not sweet at all. One is the sweetest drink you can think of. Now draw a line, with 0 at the left end and 1 at the right. Each score becomes a spot on the line. That spot is the drink's address.

The orange juice is the sweetest, at 0.8. The hazelnut latte gets 0.6, the latte 0.4, the black coffee 0.1, and the lemon juice 0.1. These tastes and scores are invented, not measured.

<figure class="ew-plate">
  <a class="ew-plate--light" href="/images/embedding-walkthrough/02-sweetness-line.svg" aria-label="Open the sweetness line at full size">
    <img src="/images/embedding-walkthrough/02-sweetness-line.svg" alt="How sweet is it? A horizontal line labeled sweetness, running from less at 0 to more at 1, with an arrow pointing toward more. Tick marks sit at 0, 0.1, 0.4, 0.6, 0.8 and 1. Illustrated drinks stand above the line, each with a short stem running down to its tick. Lemon juice and black coffee stand side by side at 0.1, their stems meeting at one point. The latte stands at 0.4, the hazelnut latte at 0.6 and the orange juice at 0.8." width="740" height="480" loading="lazy" />
  </a>
  <a class="ew-plate--dark" href="/images/embedding-walkthrough/02-sweetness-line-dark.svg" aria-label="Open the sweetness line at full size">
    <img src="/images/embedding-walkthrough/02-sweetness-line-dark.svg" alt="How sweet is it? A horizontal line labeled sweetness, running from less at 0 to more at 1, with an arrow pointing toward more. Tick marks sit at 0, 0.1, 0.4, 0.6, 0.8 and 1. Illustrated drinks stand above the line, each with a short stem running down to its tick. Lemon juice and black coffee stand side by side at 0.1, their stems meeting at one point. The latte stands at 0.4, the hazelnut latte at 0.6 and the orange juice at 0.8." width="740" height="480" loading="lazy" />
  </a>
  <figcaption>Each drink sits at its sweetness score.</figcaption>
</figure>

Already the line is useful. The orange juice and the black coffee, which nobody would mix up, sit far apart. The two lattes sit near each other in the middle, the hazelnut latte a little sweeter.

Look at the low end. The customer asks the line for something like the black coffee. The line's answer is the lemon juice.

Their sweetness matches, and that is all that matches.

The coffee tastes roasted and nutty, a little like the hazelnut latte. The lemon juice doesn't.

Try nudging the coffee along the line to 0.3, away from the lemon juice. Read the line: what does it now say about the coffee's sweetness? Taste it again. It is no sweeter than before.

Undo that nudge. The coffee goes back to 0.1, where its sweetness belongs. Keep what we tasted: the coffee is nutty.

We need somewhere else to put that.

## Give nuttiness its own direction

Leave the sweetness score where it is. Add a second number for how nutty the drink tastes.

Take a sheet of paper. Each question gets its own direction on the page: sweetness runs across it, nuttiness runs up it. Two numbers now give each drink an address on the page.

The lemon juice isn't nutty at all: 0. The coffee is quite nutty: 0.6. Before you look at the next picture, where do you think the two of them land?

<figure class="ew-plate">
  <a class="ew-plate--light" href="/images/embedding-walkthrough/03-nuttiness-map.svg" aria-label="Open the sweetness-and-nuttiness page at full size">
    <img src="/images/embedding-walkthrough/03-nuttiness-map.svg" alt="A page with sweetness running across and nuttiness running up, each from 0 to 1. Lemon juice sits at sweetness 0.1 and nuttiness 0, with black coffee directly above it at nuttiness 0.6. Orange juice sits at sweetness 0.8 and nuttiness 0. The latte sits at sweetness 0.4 and nuttiness 0.4, a little below the black coffee. The hazelnut latte sits at sweetness 0.6 and nuttiness 0.9." width="740" height="474" loading="lazy" />
  </a>
  <a class="ew-plate--dark" href="/images/embedding-walkthrough/03-nuttiness-map-dark.svg" aria-label="Open the sweetness-and-nuttiness page at full size">
    <img src="/images/embedding-walkthrough/03-nuttiness-map-dark.svg" alt="A page with sweetness running across and nuttiness running up, each from 0 to 1. Lemon juice sits at sweetness 0.1 and nuttiness 0, with black coffee directly above it at nuttiness 0.6. Orange juice sits at sweetness 0.8 and nuttiness 0. The latte sits at sweetness 0.4 and nuttiness 0.4, a little below the black coffee. The hazelnut latte sits at sweetness 0.6 and nuttiness 0.9." width="740" height="474" loading="lazy" />
  </a>
  <figcaption>The old sweetness addresses stay. The new direction holds a difference the line could not.</figcaption>
</figure>

Lemon juice and black coffee, which shared one spot on the line, now sit apart: the same sweetness, very different nuttiness. Neither sweetness score had to change to make room.

The hazelnut latte sits highest, at 0.9 nuttiness.

Put the customer's request to the page. The drink nearest the black coffee is now the latte, coffee softened with milk: sweeter, and a little less nutty.

Then the barista opens another bag of beans.

## A nutty coffee can have citrus notes, too

The new coffee is just as sweet and just as nutty as the first, but it has something the first barely has: a bright citrus note that comes from the bean itself.[^flavor]

Its scores are 0.1 and 0.6. Where does it land?

The lemon juice shares the new coffee's brightness. Try the nudge again: move the new coffee toward the lemon juice, but first guess what the map will get wrong.

<figure class="ew-piece" data-ew="coffee-placement">
  <a class="ew-fallback ew-plate--light" href="/images/embedding-walkthrough/03b-placement-experiment.svg" aria-label="Open the coffee placement experiment at full size">
    <img src="/images/embedding-walkthrough/03b-placement-experiment.svg" alt="A trial on the existing sweetness-and-nuttiness map. The original coffee stays at its nutty address. The new coffee's previous position is ghosted there. A guide arrow moves the new coffee toward lemon juice by lowering its nuttiness score, keeping sweetness unchanged. It is closer to lemon juice, but the map now calls it less nutty even though tasting says the coffees are equally nutty." width="740" height="474" loading="lazy" />
  </a>
  <a class="ew-fallback ew-plate--dark" href="/images/embedding-walkthrough/03b-placement-experiment-dark.svg" aria-label="Open the coffee placement experiment at full size">
    <img src="/images/embedding-walkthrough/03b-placement-experiment-dark.svg" alt="A trial on the existing sweetness-and-nuttiness map. The original coffee stays at its nutty address. The new coffee's previous position is ghosted there. A guide arrow moves the new coffee toward lemon juice by lowering its nuttiness score, keeping sweetness unchanged. It is closer to lemon juice, but the map now calls it less nutty even though tasting says the coffees are equally nutty." width="740" height="474" loading="lazy" />
  </a>
  <div class="ew-stage"></div>
  <figcaption id="ew-cap-coffee-placement">Once you move it, a dashed cup marks where the new coffee started. Moving it changes only its placement, never its taste.</figcaption>
</figure>

Put the new coffee back.

Squeeze a new kind of difference into an old direction, and the map lies about the old one.

So let the page become a room, with a third direction for citrus brightness.

<figure class="ew-piece" data-ew="page-to-room">
  <a class="ew-fallback ew-plate--light" href="/images/embedding-walkthrough/04-citrus-space.svg" aria-label="Open the taste room at full size">
    <img src="/images/embedding-walkthrough/04-citrus-space.svg" alt="The taste map as a room. The sweetness-and-nuttiness page has become the floor. Every drink stands on its old spot and rises by how citrusy it tastes. The two black coffees share one spot on the floor, but the new coffee rises much higher, nearer the lemon juice." width="740" height="571" loading="lazy" />
  </a>
  <a class="ew-fallback ew-plate--dark" href="/images/embedding-walkthrough/04-citrus-space-dark.svg" aria-label="Open the taste room at full size">
    <img src="/images/embedding-walkthrough/04-citrus-space-dark.svg" alt="The taste map as a room. The sweetness-and-nuttiness page has become the floor. Every drink stands on its old spot and rises by how citrusy it tastes. The two black coffees share one spot on the floor, but the new coffee rises much higher, nearer the lemon juice." width="740" height="571" loading="lazy" />
  </a>
  <div class="ew-stage"></div>
  <figcaption id="ew-cap-page-to-room">Follow the two black coffees from the line to the room.</figcaption>
</figure>

A line, a page, a room: each is a space, a place to give addresses.

**This is an embedding:** giving things addresses in a space so that useful relationships appear in their arrangement.

The sweetness line was already one.

Written down, an address is a short list of numbers, one per direction. In the order sweetness, nuttiness, citrus brightness, the first coffee is 0.1, 0.6, 0.1, and the new one is 0.1, 0.6, 0.6. Ask about creaminess or smokiness too, and every address grows a number.

We stop being able to draw a room after three directions. We don't need to. A fourth number is no harder to store than a third, and neither is the 384th. All we need are the numbers, and a way to compare them.

One picture does survive the jump. Lay the questions out as spokes from a center, one spoke per question, mark each score along its spoke, and join the marks. The drink becomes a shape. The shape depends on the order we give the spokes, which is only a convention, but a drink's shape next to another drink's shape compares the same way in any order.

<figure class="ew-plate">
  <a class="ew-plate--light" href="/images/embedding-walkthrough/04b-taste-shape.svg" aria-label="Open the taste shapes at full size">
    <img src="/images/embedding-walkthrough/04b-taste-shape.svg" alt="The new coffee drawn twice as a taste shape. Left, three spokes for sweetness, nuttiness, and citrus brightness, scored 0.1, 0.6 and 0.6, joined into a triangle. Right, the same coffee with twelve spokes, the first three unchanged and nine more imagined questions, joined into an irregular blob." width="740" height="520" loading="lazy" />
  </a>
  <a class="ew-plate--dark" href="/images/embedding-walkthrough/04b-taste-shape-dark.svg" aria-label="Open the taste shapes at full size">
    <img src="/images/embedding-walkthrough/04b-taste-shape-dark.svg" alt="The new coffee drawn twice as a taste shape. Left, three spokes for sweetness, nuttiness, and citrus brightness, scored 0.1, 0.6 and 0.6, joined into a triangle. Right, the same coffee with twelve spokes, the first three unchanged and nine more imagined questions, joined into an irregular blob." width="740" height="520" loading="lazy" />
  </a>
  <figcaption>The same coffee with three questions and with twelve. More questions change the outline, not the idea.</figcaption>
</figure>

## The same balance, at a different intensity

Another regular loved a gentle black coffee and wants another like it. That wish contains a choice: what counts as a good match?

Here is that gentle cup beside two other black coffees, all poured the same size. One tastes stronger. Call it pronounced. The other leans toward citrus. Call it citrus-led.

<figure class="ew-plate">
  <a class="ew-plate--light" href="/images/embedding-walkthrough/05-taste-profiles.svg" aria-label="Open the three coffee taste profiles at full size">
    <img src="/images/embedding-walkthrough/05-taste-profiles.svg" alt="Three black coffees drawn as taste shapes on one set of three spokes for sweetness, nuttiness, and citrus brightness. Gentle: 0.1, 0.3 and 0.3. Pronounced: 0.2, 0.6 and 0.6. Citrus-led: 0.1, 0.2 and 0.6. The pronounced outline is the gentle outline at twice the size; the citrus-led outline reaches farther along the citrus spoke." width="740" height="520" loading="lazy" />
  </a>
  <a class="ew-plate--dark" href="/images/embedding-walkthrough/05-taste-profiles-dark.svg" aria-label="Open the three coffee taste profiles at full size">
    <img src="/images/embedding-walkthrough/05-taste-profiles-dark.svg" alt="Three black coffees drawn as taste shapes on one set of three spokes for sweetness, nuttiness, and citrus brightness. Gentle: 0.1, 0.3 and 0.3. Pronounced: 0.2, 0.6 and 0.6. Citrus-led: 0.1, 0.2 and 0.6. The pronounced outline is the gentle outline at twice the size; the citrus-led outline reaches farther along the citrus spoke." width="740" height="520" loading="lazy" />
  </a>
  <figcaption>Three black coffees drawn as shapes, laid over one another. Where two outlines run close on a spoke, the drinks taste close on that question.</figcaption>
</figure>

Which of the other two tastes most like the gentle one?

The corner where every score is zero, where the arrows will begin, is a glass of plain water. Until now, a direction was one question. An arrow drawn from the water can lean partly toward nuttiness and partly toward citrus.

Ask the map two ways: with a ruler, measuring straight-line distance, and by which way the arrows point.

<figure class="ew-piece" data-ew="ruler-or-arrows">
  <a class="ew-fallback ew-plate--light" href="/images/embedding-walkthrough/06-taste-directions.svg" aria-label="Open the ruler-and-arrows figure at full size">
    <img src="/images/embedding-walkthrough/06-taste-directions.svg" alt="A view of three-part taste addresses with arrows from one start. The gentle and pronounced coffee profiles point in exactly the same direction, with the pronounced profile's arrow twice as long. The citrus-led profile points in a different direction. Small equal-sized coffee cups identify the destinations. Measured by straight-line nearness, the citrus-led cup is closer to the gentle one." width="740" height="590" loading="lazy" />
  </a>
  <a class="ew-fallback ew-plate--dark" href="/images/embedding-walkthrough/06-taste-directions-dark.svg" aria-label="Open the ruler-and-arrows figure at full size">
    <img src="/images/embedding-walkthrough/06-taste-directions-dark.svg" alt="A view of three-part taste addresses with arrows from one start. The gentle and pronounced coffee profiles point in exactly the same direction, with the pronounced profile's arrow twice as long. The citrus-led profile points in a different direction. Small equal-sized coffee cups identify the destinations. Measured by straight-line nearness, the citrus-led cup is closer to the gentle one." width="740" height="590" loading="lazy" />
  </a>
  <div class="ew-stage"></div>
  <figcaption id="ew-cap-ruler-or-arrows">Ask the map two ways, with a ruler and with arrows from the start. Turn the room to check what the drawing shows.</figcaption>
</figure>

Comparing only which way arrows point, ignoring their length, has a name: **cosine similarity**. Arrows that point the same way score 1, as the gentle and pronounced cups do. Arrows at right angles, sharing nothing, score 0. It is the usual way to compare embeddings.[^cosine]

By cosine similarity, the gentle cup and the pronounced cup are a perfect match. To the regular, who loved the gentle cup for being gentle, they are not.

Choosing how to compare addresses means choosing which differences should count.

## How does the model learn the map?

We chose these taste questions ourselves, and scored every drink by hand.

Now swap the drinks for text: menu notes, a request typed into the café's site. But who tastes a sentence? There are too many sentences to score by hand, and nobody knows which questions to ask.

Words alone make a poor map. Say a customer types "a nutty coffee with a little brightness." A menu note reads "hazelnut roast, lemony finish." They share no words. A notice that reads "the coffee bar is closed for a little while" shares three words with the request and means nothing to it. Counting shared words gets both backward.

So the job goes to a program that reads a piece of text and writes down its address. That program is the model. Nobody hands it taste questions. It learns from examples that say only this much: these two belong together, that one does not. A request for a bright nutty coffee belongs with the note "toasted nuts, bright and clean," and not with the notice about the closed bar.[^ranking]

Before training, every address is a guess, and the nearest note to that request could be anything. Each example nudges the addresses: the pair we wanted moves a little closer, the stranger a little farther. Then the next example, and the next. The map is the sum of those small corrections. Closeness is judged the way the arrows judged the cups, by direction, so a stronger and a milder note of the same balance end up neighbors.

At the counter, when the page lied, we fixed it by adding a direction. The model cannot. Before training starts, its builders decide how many numbers every address gets, hundreds or a few thousand, and that count never changes.[^training] What a nudge moves is the model's settings, the ones that write every address, so no text ever moves alone. Texts that share words, or share a meaning, move together, including texts the model will only meet after training. A real model has millions of those settings, and a sentence's address is computed from all of them.

Nobody names the directions, either. We called ours sweetness, nuttiness, and citrus brightness. In a real model no single number means nutty. A likeness is spread across many numbers, and nobody chose what number 412 is for.[^learned] The examples asked for certain texts to sit together, and the directions became whatever that took. Where hundreds of them run out of room, the map gets some neighbors wrong, in ways no single number will show you.

That evening, the customer who loved the black coffee opens the café's site and types what they want: "a nutty coffee with a little brightness." The model writes it an address like any other text. The nearest address belongs to the menu note for the second bag of beans: "almond notes, citrus finish."

Next morning, you pour them a cup. Not one word in common with their request, and the nearest address on the map.

We began with one question and a line. At the counter we grew the map by asking another question, and another. The model grows it by nudging addresses until the examples agree. Either way the result is the same kind of thing: an arrangement in which being near means being alike. That is what an embedding is for.

## Notes and further reading

[^flavor]: [World Coffee Research's Sensory Lexicon](https://worldcoffeeresearch.org/resources/sensory-lexicon) describes 110 flavor, aroma, and texture attributes of coffee, among them citrus notes such as lemon and orange, and nutty notes such as hazelnut and almond.

[^cosine]: [Google's explanation of supervised similarity measures](https://developers.google.com/machine-learning/clustering/dnn-clustering/supervised-similarity) compares straight-line distance with direction-based similarity. Our cups, as sweetness, nuttiness, citrus brightness: gentle `(0.1, 0.3, 0.3)`, pronounced `(0.2, 0.6, 0.6)`, citrus-led `(0.1, 0.2, 0.6)`. For the direction score, multiply matching scores, add them, and divide by the two arrow lengths. For gentle and citrus-led that is `0.01 + 0.06 + 0.18 = 0.25`, divided by `0.436 × 0.640`, which gives about `0.90`, an angle of about 26 degrees. Gentle and pronounced score exactly `1`. By straight-line distance the citrus-led cup is nearer, `0.32` against `0.44`. Real embeddings can contain negative numbers, so their arrows can point apart and score as low as `-1`. Once every arrow has length 1, distance and direction rank pairs identically. [OpenAI's embeddings guide](https://developers.openai.com/api/docs/guides/embeddings) recommends cosine similarity for comparing its embeddings, which come at length 1.

[^training]: [Google's explanation of obtaining embeddings](https://developers.google.com/machine-learning/crash-course/embeddings/obtaining-embeddings) describes choosing an embedding layer's size before training and learning its values during training. Each number in an address is what you will see called a dimension. [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) writes 384 numbers per address, OpenAI's text-embedding-3-small writes 1,536, and text-embedding-3-large writes 3,072 by default.

[^ranking]: [Sentence Transformers' ranking-loss documentation](https://www.sbert.net/docs/package_reference/sentence_transformer/losses.html#multiplenegativesrankingloss) describes training a request's matching passage to score above the other passages in its batch. By default it scores each pair with cosine similarity, so training turns the request's arrow toward its match.

[^learned]: [Google's introduction to embedding space](https://developers.google.com/machine-learning/crash-course/embeddings/embedding-space) explains why the individual dimensions of a learned embedding, the single numbers in an address, rarely have a simple interpretation. A direction that mixes many numbers sometimes does. Our named taste directions are a teaching aid.
