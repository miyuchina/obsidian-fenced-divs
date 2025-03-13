# Fenced Divs for Obsidian

This Obsidian plugin supports the special fenced syntax for Pandoc Markdown:

```
::: {.id #className}
This is rendered as _Markdown_.

- Some list items
    - More list items
    - You get the idea ...
:::
```

## Development

To install dependencies:

```bash
bun install
```

To compile:

```bash
bun run dev
```
