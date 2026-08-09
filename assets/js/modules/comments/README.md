# Comment providers

`index.js` picks a provider by name from `comments.provider` in
`assets/js/config.js`. Pages only ever call `initComments(mount, post)` — they
have no idea which backend is in use, which is what makes the backend
swappable.

```
index.js      resolves the provider, falls back if it declines
giscus.js     GitHub Discussions  (active)
fallback.js   the panel shown when no provider mounts
```

## The provider contract

A provider is one function:

```js
export function mountX(mount, post) { … }
```

| | |
| --- | --- |
| `mount` | The empty `<div data-comments>` on `post.html`. Take it over entirely. |
| `post` | The post's manifest entry — `{ slug, title, date, tags, summary }`. |

Return one of:

```js
return { ok: true };                       // you have rendered into `mount`
return {                                   // you declined; explain why
    ok: false,
    headline: "Comments are not switched on yet.",
    detail: "What is missing and where to fix it.",
    action: { label: "Somewhere useful", href: "https://…" },   // optional
};
```

Never leave `mount` empty and never throw — returning `ok: false` gets the
reader a useful panel instead of a blank space.

## Adding a provider

1. Write `myprovider.js` exporting a mount function as above.
2. Register it in `index.js`:

   ```js
   import { mountMyProvider } from "./myprovider.js";
   const providers = { giscus: mountGiscus, myprovider: mountMyProvider };
   ```

3. Set `comments.provider = "myprovider"` in `config.js`, alongside whatever
   config keys your provider needs.

Nothing else in the site changes — no HTML, no CSS, no page modules.

## If you build a self-hosted backend later

The likely shape, given you already run things on Cloudflare: a Worker with
`GET /comments?post=<slug>` and `POST /comments`, D1 for storage, Turnstile on
submit, and an approval flag so nothing appears until you allow it. That
provider would render its own form and thread into `mount` and return
`{ ok: true }`. The trade-off to weigh at the time: anyone can post without a
login, which is better for reach and worse for your inbox.

Style it with the existing components — `.form`, `.field`, `.btn`,
`.card` — rather than adding new CSS.
