/**
 * Build styles
 */
import { API, InlineTool, InlineToolConstructorOptions, SanitizerConfig } from "../../../types";
import { MenuConfig } from '@/types/tools';
import { generateTagId } from '../utils';

interface IconClasses {
  base: string;
  active: string;
}

/**
 * Inline Code Tool for the Editor.js
 *
 * Allows to wrap inline fragment and style it somehow.
 */
export default class TagInlineTool implements InlineTool {
  /**
   * Editor.js API
   */
  private api: API;
  /**
   * Button element for the toolbar
   */
  private button: HTMLButtonElement | null;
  /**
   * Tag representing the term
   */
  private tag: string = 'TAG';
  /**
   * CSS classes for the icon
   */
  private iconClasses: IconClasses;

  public static title: string = 'tag';

  /**
   * Styles
   */
  private readonly CSS = {
    tag: 'inline-tag',
  };

  constructor({ api }: InlineToolConstructorOptions) {
    this.api = api;

    this.button = null;

    this.iconClasses = {
      base: this.api.styles.inlineToolButton,
      active: this.api.styles.inlineToolButtonActive,
    };
  }

  /**
   * Specifies Tool as Inline Toolbar Tool
   *
   * @return {boolean}
   */
  static get isInline(): boolean {
    return true;
  }

  /**
   * Create button element for Toolbar
   *
   * @return {HTMLElement}
   */
  render(): HTMLElement {
    // return {
    //   icon: this.toolboxIcon,
    //   onActivate: () => {
    //     //
    //   },
    // };
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add(this.iconClasses.base);
    this.button.innerHTML = this.toolboxIcon;

    return this.button;
  }

  /**
   * Wrap/Unwrap selected fragment
   *
   * @param {Range} range - selected fragment
   */
  surround(range: Range): void {
    if (!range) {
      return;
    }

    let termWrapper = this.api.selection.findParentTag(this.tag, this.CSS.tag) as HTMLElement;

    /**
     * If start or end of selection is in the highlighted block
     */
    if (termWrapper) {
      this.unwrap(termWrapper);
    } else {
      this.wrap(range);
    }
  }

  /**
   * Wrap selection with term-tag
   *
   * @param {Range} range - selected fragment
   */
  wrap(range: Range): void {
    /**
     * Create a wrapper for highlighting
     */
    let span = document.createElement(this.tag);

    span.classList.add(this.CSS.tag);
    span.setAttribute('contenteditable', 'false');
    span.dataset.id = generateTagId();

    /**
     * SurroundContent throws an error if the Range splits a non-Text node with only one of its boundary points
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Range/surroundContents}
     *
     * // range.surroundContents(span);
     */
    span.appendChild(range.extractContents());
    range.insertNode(span);

    /**
     * Expand (add) selection to highlighted block
     */
    this.api.selection.expandToTag(span);
  }

  /**
   * Unwrap term-tag
   *
   * @param {HTMLElement} termWrapper - term wrapper tag
   */
  unwrap(termWrapper: HTMLElement): void {
    /**
     * Expand selection to all term-tag
     */
    this.api.selection.expandToTag(termWrapper);

    const sel = window.getSelection();
    if (!sel) return;

    const range = sel.getRangeAt(0);
    const unwrappedContent = range.extractContents();

    /**
     * Remove empty term-tag
     */
    termWrapper.parentNode?.removeChild(termWrapper);

    /**
     * Insert extracted content
     */
    range.insertNode(unwrappedContent);

    /**
     * Restore selection
     */
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * Check and change Term's state for current selection
   *
   * @return {boolean}
   */
  checkState(): boolean {
    const termTag = this.api.selection.findParentTag(this.tag, this.CSS.tag);

    if (this.button) {
      this.button.classList.toggle(this.iconClasses.active, !!termTag);
    }

    return !!termTag;
  }


  /**
   * Get Tool icon's SVG
   * '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6 7L6 12M6 17L6 12M6 12L12 12M12 7V12M12 17L12 12"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M19 17V10.2135C19 10.1287 18.9011 10.0824 18.836 10.1367L16 12.5"/></svg>'
   * @return {string}
   */
  get toolboxIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-tag" viewBox="0 0 16 16">
  <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M6 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m-1 0a.5.5 0 1 0-1 0 .5.5 0 0 0 1 0"/>
  <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M2 1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 1 6.586V2a1 1 0 0 1 1-1m0 5.586 7 7L13.586 9l-7-7H2z"/>
</svg>`;
  }

  /**
   * Sanitizer rule
   * @return {SanitizerConfig}
   */
  static get sanitize(): SanitizerConfig {
    return {
      tag: {
      },
    };
  }
}
