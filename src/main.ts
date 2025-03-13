import {
  editorInfoField,
  editorLivePreviewField,
  Component,
  MarkdownRenderer,
  Plugin,
} from "obsidian";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { FencedDiv } from "./FencedDiv";

import type { Extension, Transaction } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import type { FencedDivInfo } from "./FencedDiv";

export default class FencedDivPlugin extends Plugin {
  async onload() {
    this.registerEditorExtension([fencedDivField]);
  }
}

const clickFencedDivEffect = StateEffect.define<number>();

const fencedDivField = StateField.define<DecorationSet>({
  create(_): DecorationSet {
    return Decoration.none;
  },

  update(_oldState: DecorationSet, transaction: Transaction): DecorationSet {
    return decorateFencedDivs(transaction);
  },

  provide(field: StateField<DecorationSet>): Extension {
    return EditorView.decorations.from(field);
  },
});

function decorateFencedDivs(transaction: Transaction): DecorationSet {
  if (!transaction.state.field(editorLivePreviewField)) {
    return Decoration.none;
  }

  const fenceStartRegex =
    /^:{3,} *?(?:([^:\s{}]+?)|(\{(?:\s*[#.][\w_-]+?)*\s*\}))?(?: :+?)?$/;
  const fenceEndRegex = /^:{3,}$/;

  const app = transaction.state.field(editorInfoField).app;
  const text = transaction.state.doc;
  const builder = new RangeSetBuilder<Decoration>();

  let info: FencedDivInfo | undefined = undefined;

  for (let i = 1; i <= text.lines; i++) {
    let line = text.line(i);
    let match = undefined;
    if (info !== undefined) {
      if (fenceEndRegex.test(line.text)) {
        if (!fencedDivSelected(info.from, line.to, transaction)) {
          info.to = line.to;

          const fencedText = text.slice(info.from, info.to);
          info.textStartPos = info.from + fencedText.line(2).from;
          info.content = fencedText.sliceString(
            fencedText.line(2).from,
            fencedText.line(fencedText.lines - 1).to,
          );

          const renderMarkdown = (content: string) => {
            const component = new Component();
            component.load();
            const div = createDiv();
            const file = app.workspace?.getActiveFile()?.path ?? "";
            MarkdownRenderer.render(app, content, div, file, component);
            component.unload();
            return div;
          };

          let fencedDiv = new FencedDiv(info, renderMarkdown);
          let decoration = Decoration.replace({
            widget: new FencedDivWidget(fencedDiv),
            block: true,
          });
          builder.add(info.from, info.to, decoration);
        }
        info = undefined;
      }
    } else if ((match = line.text.match(fenceStartRegex))) {
      info = {
        from: line.from,
        to: undefined,
        textStartPos: undefined,
        content: undefined,
        bareClassName: match[1],
        fencedAttrs: match[2],
      };
    }
  }

  return builder.finish();
}

function fencedDivSelected(
  from: number,
  to: number,
  transaction: Transaction,
): boolean {
  for (let effect of transaction.effects) {
    if (effect.is(clickFencedDivEffect) && effect.value === from) {
      return true;
    }
  }

  for (let range of transaction.newSelection.ranges) {
    let selectionFrom = range.from;
    let selectionTo = range.to;
    if (selectionFrom > selectionTo) {
      [selectionFrom, selectionTo] = [selectionTo, selectionFrom];
    }

    if (from <= selectionTo && to >= selectionFrom) {
      return true;
    }
  }
  return false;
}

class FencedDivWidget extends WidgetType {
  div: FencedDiv;

  constructor(div: FencedDiv) {
    super();
    this.div = div;
  }

  toDOM(view: EditorView): HTMLElement {
    const element = this.div.render();
    element.onclick = () => {
      view.dispatch({
        effects: [clickFencedDivEffect.of(this.div.from)],
        selection: {
          anchor: this.div.textStartPos,
          head: this.div.textStartPos,
        },
      });
    };
    return element;
  }
}
