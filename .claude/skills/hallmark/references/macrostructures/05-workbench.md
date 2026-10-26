## 05 · Workbench

Real product captures are the primary content. The page is a guided tour of the app in use, with short captions in place of marketing copy.

- **Heading:** small and functional; a workbench page does not shout.
- **Body:** a sequence of capture blocks, each a `<figure>` with a `<figcaption>` that states a fact and one inline annotation.
- **Divider:** the figure is the divider; sections separate by gap and figure.
- **Button:** the hero's one action (44b), then a sticky bottom bar carrying it after the third capture, once context is built, labelled with the verb ("Start a project").
- **Image:** the real capture, unframed, in a `<figure>`, or a labelled `data-slot` when the user has not supplied it (`craft.md` § 8). No browser or device chrome (47a, 47b).
- **Reveal:** one type-unmask, on the first caption; the captures load instantly and the rest is simply there.

Reach for it for SaaS, developer tools, editor extensions, anywhere seeing the product in use is the sale.

Avoid when the product is conceptual or services-led. Workbench needs a UI to show.

Code: [`../components/f5-annotated-screenshot.md`](../components/f5-annotated-screenshot.md) for the blocks, [`../components/c4-sticky-bottom-bar.md`](../components/c4-sticky-bottom-bar.md) for the bar.

**Sample opening lines** (imitate the specificity; the page walks the visitor through):
> *"$ streampipe parse access.log --filter status=5xx | jq"* Opens on a real command, not a claim.
> *"Read anything that emits lines: files, pipes, sockets, kubectl logs."* Names the inputs, refuses abstraction.
> *"Open the trace, find the span, fix the regression."* Three concrete verbs.
