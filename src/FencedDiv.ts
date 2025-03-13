export class FencedDiv {
  classList: string[];
  id?: string;
  from: number;
  to: number;
  textStartPos: number;
  content: string;
  name?: string;
  renderMarkdown: (s: string) => HTMLElement;

  constructor(info: FencedDivInfo, renderMarkdown: (s: string) => HTMLElement) {
    if (
      info.to === undefined ||
      info.textStartPos === undefined ||
      info.content === undefined
    ) {
      throw new Error("Incomplete fenced div info.");
    }

    this.from = info.from;
    this.to = info.to;
    this.textStartPos = info.textStartPos;
    this.content = info.content;
    this.name = info.bareClassName;
    this.renderMarkdown = renderMarkdown;

    if (info.bareClassName) {
      let match = info.bareClassName.match(/\S+/);
      this.classList = match ?? [];
    } else if (info.fencedAttrs) {
      [this.id, this.classList] = parseIdAndClass(info.fencedAttrs);
    } else {
      this.classList = [];
    }
  }

  render(): HTMLElement {
    const div = this.renderMarkdown(this.content);

    div.classList.add("obsidian-fenced-div");
    for (let className of this.classList) {
      div.classList.add(className);
    }
    if (this.id) {
      div.id = this.id;
    }

    if (this.name) {
      const nameBanner = document.createElement("div");
      nameBanner.classList.add("obsidian-fenced-div-name-banner");
      nameBanner.innerText = this.name;
      div.prepend(nameBanner);
    }

    return div;
  }
}

export type FencedDivInfo = {
  from: number;
  to?: number;
  textStartPos?: number;
  content?: string;
  bareClassName?: string;
  fencedAttrs?: string;
};

function parseIdAndClass(fencedAttrs: string): [string | undefined, string[]] {
  let id = undefined;
  let classList: string[] = [];

  let idMatch = fencedAttrs.match(/#[\w_-]+/g);
  if (idMatch) {
    for (let idName of idMatch) {
      id = idName;
    }
  }

  let classMatch = fencedAttrs.match(/\.[\w_-]+/g);
  if (classMatch) {
    classList = classMatch;
  }

  return [id, classList];
}
