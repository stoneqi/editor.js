/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Module from '../../__module';
import $ from '../../dom';
import SelectionUtils from '../../selection';
import * as _ from '../../utils';
import type { InlineTool as IInlineTool } from '../../../../types';
import I18n from '../../i18n';
import { I18nInternalNS } from '../../i18n/namespace-internal';
import Shortcuts from '../../utils/shortcuts';
import type { ModuleConfig } from '../../../types-internal/module-config';
import type { Popover, PopoverItemHtmlParams, PopoverItemParams, WithChildren } from '../../utils/popover';
import { PopoverItemType } from '../../utils/popover';
import { PopoverInline } from '../../utils/popover/popover-inline';
import { PopoverSelect } from '../../utils/popover/popover-select';
import { isPrintableKey } from '../../utils';
import { selectionChangeDebounceTimeout, triggertInputShowDebounceTimeout } from '../../constants';


/**
 * Inline toolbar with actions that modifies selected text fragment
 *
 * |¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯|
 * |   B  i [link] [mark]   |
 * |________________________|
 */
export default class TriggerInputTool extends Module {
  /**
   * CSS styles
   */
  public CSS = {
    triggerToolbar: 'ce-trigger-toolbar',
  };

  /**
   * State of inline toolbar
   */
  public opened = false;

  /**
   * State of inline toolbar
   */
  public isTriggering = false;


  /**
   * State of inline toolbar
   */
  public currentTriggerInputRange : Range | null = false;

  public currentBlockIndex  = -1;

  public triggertInputShowDebounced = _.debounce(async () => {
    console.log('triggrtInput show', this.currentTriggerInputRange?.toString());
    await this.open();
  }, triggertInputShowDebounceTimeout);

  /**
   * Popover instance reference
   */
  private popover: Popover | null = null;

  /**
   * Margin above/below the Toolbar
   */
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  private readonly toolbarVerticalMargin: number = _.isMobileScreen() ? 20 : 6;

  /**
   * Currently visible tools instances
   */
  private toolsInstances: Map<string, IInlineTool> | null = new Map();

  /**
   * @param moduleConfiguration - Module Configuration
   * @param moduleConfiguration.config - Editor's config
   * @param moduleConfiguration.eventsDispatcher - Editor's event dispatcher
   */
  constructor({ config, eventsDispatcher }: ModuleConfig) {
    super({
      config,
      eventsDispatcher,
    });
  }

  /**
   * Toggles read-only mode
   *
   * @param {boolean} readOnlyEnabled - read-only mode
   */
  public toggleReadOnly(readOnlyEnabled: boolean): void {
    if (!readOnlyEnabled) {
      window.requestIdleCallback(() => {
        this.make();
      }, { timeout: 2000 });
    } else {
      this.destroy();
    }
  }

  /**
   *  Moving / appearance
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

  /**
   * Shows Inline Toolbar if something is selected
   *
   * @param [needToClose] - pass true to close toolbar if it is not allowed.
   *                                  Avoid to use it just for closing IT, better call .close() clearly.
   * @param keycode
   */
  public async tryToShow(keycode: string): Promise<void> {
    if (!this.allowedToShow(keycode)) {
      this.close();

      return;
    }
    this.triggertInputShowDebounced();
    this.Editor.Toolbar.close();
  }


  /**
   *  Moving / appearance
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

  /**
   * Shows Inline Toolbar if something is selected
   *
   * @param [needToClose] - pass true to close toolbar if it is not allowed.
   *                                  Avoid to use it just for closing IT, better call .close() clearly.
   * @param tipPrompt
   */
  public async tryToShowItem(needToClose = false, tipPrompt=''): Promise<void> {
    if (needToClose) {
      this.close();
    }

    // if (!this.allowedToShow()) {
    //   return;
    // }

    await this.openItem();

    this.Editor.Toolbar.close();
    // debugger
  }


  /**
   * Hides Inline Toolbar
   */
  public close(): void {
    if (!this.opened) {
      return;
    }
    if (this.Editor.ReadOnly.isEnabled) {
      return;
    }

    console.log('triggrtInput close', this.currentTriggerInputRange?.toString());


    this.currentTriggerInputRange = null;
    this.isTriggering = false;

    // Array.from(this.toolsInstances.entries()).forEach(([name, toolInstance]) => {
    //   /**
    //    * @todo replace 'clear' with 'destroy'
    //    */
    //   if (_.isFunction(toolInstance.clear)) {
    //     toolInstance.clear();
    //   }
    // });

    this.toolsInstances = null;
    // this.Editor.BlockManager.currentInputRange = null;

    this.reset();
    this.opened = false;

    this.popover?.hide();
    this.popover?.destroy();
    this.popover = null;
  }

  /**
   * Check if node is contained by Inline Toolbar
   *
   * @param {Node} node — node to check
   */
  public containsNode(node: Node): boolean {
    if (this.nodes.wrapper === undefined) {
      return false;
    }

    return this.nodes.wrapper.contains(node);
  }

  /**
   * Removes UI and its components
   */
  public destroy(): void {
    this.removeAllNodes();
    this.popover?.destroy();
    this.popover = null;
  }

  /**
   * Making DOM
   */
  private make(): void {
    this.nodes.wrapper = $.make('div', [
      this.CSS.triggerToolbar,
      ...(this.isRtl ? [ this.Editor.UI.CSS.editorRtlFix ] : []),
    ]);

    if (import.meta.env.MODE === 'test') {
      this.nodes.wrapper.setAttribute('data-cy', 'inline-toolbar');
    }

    /**
     * Append the inline toolbar to the editor.
     */
    $.append(this.Editor.UI.nodes.wrapper, this.nodes.wrapper);
  }

  /**
   * Shows Inline Toolbar
   */
  private async open(): Promise<void> {
    // debugger;
    // if (this.opened) {
    //   return;
    // }

    /**
     * Show Inline Toolbar
     */

    this.opened = true;

    if (this.popover !== null) {
      this.popover.destroy();
    }

    const currentSelection = SelectionUtils.get();
    const currentBlock = this.Editor.BlockManager.getBlock(currentSelection.anchorNode as HTMLElement);


    const popoverItems = [] as PopoverItemParams[];
    const tool = currentBlock.tool.inlineTools.get('link');

    if (tool === undefined) {
      return;
    }

    const instance = tool.create();
    // 获取渲染元素，可能多个
    const renderedTool = await instance.render();

    if (this.toolsInstances === null) {
      this.toolsInstances = new Map();
    }

    // 写入当前工具实例
    this.toolsInstances.set(tool.name, instance);

    const toolTitle = I18n.t(
      I18nInternalNS.toolNames,
      tool.title || _.capitalize(tool.name)
    );


    [ renderedTool ].flat().forEach((item) => {
      // 写入当前元素
      const commonPopoverItemParams = {
        name: tool.name,
        // 点击的时候执行的参数
        onActivate: () => {
          this.toolClicked(instance);
        },
        // 提示
        hint: {
          title: toolTitle,
          description: '',
        },
        isFlippable: true,
      } as PopoverItemParams;
      const popoverItem = {
        ...commonPopoverItemParams,
        element: item,
        type: PopoverItemType.Html,

      } as PopoverItemParams;

      popoverItems.push(popoverItem);
    });

    this.popover = new PopoverSelect({
      items: popoverItems,
      scopeElement: this.Editor.API.methods.ui.nodes.redactor,
      messages: {
        nothingFound: I18n.ui(I18nInternalNS.ui.popover, 'Nothing found'),
        search: I18n.ui(I18nInternalNS.ui.popover, 'Filter'),
      },
    });

    this.move(this.popover.size.width);

    this.nodes.wrapper?.append(this.popover.getElement());

    this.popover.show();
  }

  /**
   * Shows Inline Toolbar
   */
  private async openItem(): Promise<void> {
    if (this.opened) {
      return;
    }

    /**
     * Show Inline Toolbar
     */

    this.opened = true;

    if (this.popover !== null) {
      this.popover.destroy();
    }

    const inlineTools = await this.getInlineTools();

    this.popover = new PopoverInline({
      items: inlineTools,
      scopeElement: this.Editor.API.methods.ui.nodes.redactor,
      messages: {
        nothingFound: I18n.ui(I18nInternalNS.ui.popover, 'Nothing found'),
        search: I18n.ui(I18nInternalNS.ui.popover, 'Filter'),
      },
    });

    this.move(this.popover.size.width);

    this.nodes.wrapper?.append(this.popover.getElement());

    this.popover.show();
  }

  /**
   * Move Toolbar to the selected text
   *
   * @param popoverWidth - width of the toolbar popover
   */
  // 将 Toolbar 放到合适的位置
  private move(popoverWidth: number): void {
    const selectionRect = SelectionUtils.rect as DOMRect;
    // 获取当前warpper 的长宽
    const wrapperOffset = this.Editor.UI.nodes.wrapper.getBoundingClientRect();
    // 计算实际的坐标
    const newCoords = {
      x: selectionRect.x - wrapperOffset.x,
      y: selectionRect.y +
        selectionRect.height -
        // + window.scrollY
        wrapperOffset.top +
        this.toolbarVerticalMargin,
    };

    const realRightCoord = newCoords.x + popoverWidth + wrapperOffset.x;

    /**
     * Prevent InlineToolbar from overflowing the content zone on the right side
     */
    // 保护当前的坐标不会超出页面范围
    if (realRightCoord > this.Editor.UI.contentRect.right) {
      newCoords.x = this.Editor.UI.contentRect.right -popoverWidth - wrapperOffset.x;
    }
    // 设置当前 wrapper 的漂移位置
    this.nodes.wrapper!.style.left = Math.floor(newCoords.x) + 'px';
    this.nodes.wrapper!.style.top = Math.floor(newCoords.y) + 'px';
  }

  /**
   * Clear orientation classes and reset position
   */
  private reset(): void {
    this.nodes.wrapper!.style.left = '0';
    this.nodes.wrapper!.style.top = '0';
  }

  /**
   * Need to show Inline Toolbar or not
   *
   * @param keycode
   */
  private allowedToShow( keycode :string ): boolean {
    // debugger;
    /**
     * Tags conflicts with window.selection function.
     * Ex. IMG tag returns null (Firefox) or Redactors wrapper (Chrome)
     */
    if (!this.isTriggering) {
      if (this.isToolTrigger(keycode)) {
        this.isTriggering = true;
        const currentSelection = SelectionUtils.get();

        if (currentSelection && currentSelection.rangeCount > 0) {
          const rangeCopy = currentSelection.getRangeAt(0).cloneRange();

          // debugger;

          this.currentBlockIndex = this.Editor.BlockManager.currentBlockIndex;
          // rangeCopy.setEnd(startNode, startOffset);
          this.currentTriggerInputRange =  rangeCopy;
          this.currentTriggerInputRange.setStart(this.currentTriggerInputRange.startContainer, this.currentTriggerInputRange.startOffset-1);

          return true;
        }
      }


      return false;
    }
    const ignoreKeys: string[] = [_.keys.LEFT, _.keys.RIGHT];

    // debugger;
    if (ignoreKeys.includes(keycode)) {
      return false;
    }

    if ( this.isTriggering && this.currentTriggerInputRange && this.currentBlockIndex === this.Editor.BlockManager.currentBlockIndex ) {
      const currentSelection = SelectionUtils.get();

      if (currentSelection.rangeCount > 0) {
        const cursorRange = currentSelection.getRangeAt(0);
        const cursorStart = cursorRange.startOffset;
        const sampleRangeStart = this.currentTriggerInputRange.startOffset;

        if (cursorStart >= sampleRangeStart) {
          this.currentTriggerInputRange.setEnd(this.currentTriggerInputRange.endContainer, cursorStart);
          if (!this.currentTriggerInputRange.collapsed) {
            return true;
          }
        }
      }
    }

    return false;

    // const currentSelection = SelectionUtils.get();
    // const selectedText = SelectionUtils.text;
    //
    // // old browsers
    // if (!currentSelection || !currentSelection.anchorNode) {
    //   return false;
    // }

    // // empty selection
    // if (currentSelection.isCollapsed || selectedText.length < 1) {
    //   return false;
    // }
    //
    // const target = !$.isElement(currentSelection.anchorNode)
    //   ? currentSelection.anchorNode.parentElement
    //   : currentSelection.anchorNode;
    //
    // if (target === null) {
    //   return false;
    // }
    //
    // // The selection of the element only in contenteditable
    // const contenteditable = target.closest('[contenteditable="true"]');
    //
    // if (contenteditable === null) {
    //   return false;
    // }
    //
    // // is enabled by current Block's Tool
    // const currentBlock = this.Editor.BlockManager.getBlock(currentSelection.anchorNode as HTMLElement);
    //
    // if (!currentBlock) {
    //   return false;
    // }
    //
    // return currentBlock.tool.inlineTools.size !== 0;
  }

  /**
   *  Working with Tools
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

  /**
   *
   * @param keycode
   */
  private selectInTriggerRange(): boolean {
    if ( this.isTriggering && this.currentTriggerInputRange && this.currentBlockIndex === this.Editor.BlockManager.currentBlockIndex ) {
      const currentSelection = SelectionUtils.get();

      if (currentSelection.rangeCount > 0 ) {
        const cursorRange = currentSelection.getRangeAt(0);
        const cursorStart = cursorRange.startOffset;
        const sampleRangeStart =this.currentTriggerInputRange.startOffset;
        const sampleRangeEnd = this.currentTriggerInputRange.endOffset;

        if (cursorStart >= sampleRangeStart && cursorStart <= sampleRangeEnd + 1) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Returns Inline Tools segregated by their appearance type: popover items and custom html elements.
   * Sets this.toolsInstances map
   */
  private async getInlineTools(): Promise<PopoverItemParams[]> {
    const currentSelection = SelectionUtils.get();
    const currentBlock = this.Editor.BlockManager.getBlock(currentSelection.anchorNode as HTMLElement);

    const inlineTools = Array.from(currentBlock.tool.inlineTools.values());

    const popoverItems = [] as PopoverItemParams[];

    if (this.toolsInstances === null) {
      this.toolsInstances = new Map();
    }

    for (let i = 0; i < inlineTools.length; i++) {
      // 单个工具初始化
      const tool = inlineTools[i];
      const instance = tool.create();
      // 获取渲染元素，可能多个
      const renderedTool = await instance.render();

      // 写入当前工具实例
      this.toolsInstances.set(tool.name, instance);

      if (shortcut) {
        try {
          this.enableShortcuts(tool.name, shortcut);
        } catch (e) {}
      }

      const shortcutBeautified = shortcut !== undefined ? _.beautifyShortcut(shortcut) : undefined;

      const toolTitle = I18n.t(
        I18nInternalNS.toolNames,
        tool.title || _.capitalize(tool.name)
      );

      // 首先将 renderedTool 包裹在一个数组中（如果 renderedTool 本身不是数组的话，这一步就相当于将其转换为只包含该元素的数组形式），然后使用 flat() 方法对这个数组进行扁平化处理，最后使用 forEach 方法对扁平化后的数组元素进行遍历操作
      [ renderedTool ].flat().forEach((item) => {
        // 写入当前元素
        const commonPopoverItemParams = {
          name: tool.name,
          // 点击的时候执行的参数
          onActivate: () => {
            this.toolClicked(instance);
          },
          // 提示
          hint: {
            title: toolTitle,
            description: shortcutBeautified,
          },
        } as PopoverItemParams;

        // 如果是 html 元素
        if ($.isElement(item)) {
          /**
           * Deprecated way to add custom html elements to the Inline Toolbar
           */

          const popoverItem = {
            ...commonPopoverItemParams,
            element: item,
            type: PopoverItemType.Html,
          } as PopoverItemParams;

          /**
           * If tool specifies actions in deprecated manner, append them as children
           */
          if (_.isFunction(instance.renderActions)) {
            const actions = instance.renderActions();

            (popoverItem as WithChildren<PopoverItemHtmlParams>).children = {
              isOpen: instance.checkState?.(SelectionUtils.get()),
              /** Disable keyboard navigation in actions, as it might conflict with enter press handling */
              isFlippable: false,
              items: [
                {
                  type: PopoverItemType.Html,
                  element: actions,
                },
              ],
            };
          } else {
            /**
             * Legacy inline tools might perform some UI mutating logic in checkState method, so, call it just in case
             */
            instance.checkState?.(SelectionUtils.get());
          }

          popoverItems.push(popoverItem);
        } else if (item.type === PopoverItemType.Html) {
          /**
           * Actual way to add custom html elements to the Inline Toolbar
           */
          popoverItems.push({
            ...commonPopoverItemParams,
            ...item,
            type: PopoverItemType.Html,
          });
        } else if (item.type === PopoverItemType.Separator) {
          /**
           * Separator item
           */
          popoverItems.push({
            type: PopoverItemType.Separator,
          });
        } else {
          /**
           * Default item
           */
          const popoverItem = {
            ...commonPopoverItemParams,
            ...item,
            type: PopoverItemType.Default,
          } as PopoverItemParams;

          /** Prepend with separator if item has children and not the first one */
          if ('children' in popoverItem && i !== 0) {
            popoverItems.push({
              type: PopoverItemType.Separator,
            });
          }

          popoverItems.push(popoverItem);

          /** Append separator after the item is it has children and not the last one */
          if ('children' in popoverItem && i < inlineTools.length - 1) {
            popoverItems.push({
              type: PopoverItemType.Separator,
            });
          }
        }
      });
    }

    return popoverItems;
  }

  /**
   * Get shortcut name for tool
   *
   * @param toolName — Tool name
   * @param keycode
   */
  private isToolTrigger(keycode: string): boolean {
    const triggerKey: string[] = [ '#' ];

    return triggerKey.includes(keycode);
  }

  /**
   * Enable Tool shortcut with Editor Shortcuts Module
   *
   * @param toolName - tool name
   * @param shortcut - shortcut according to the ShortcutData Module format
   */
  private enableShortcuts(toolName: string, shortcut: string): void {
    Shortcuts.add({
      name: shortcut,
      handler: (event) => {
        const { currentBlock } = this.Editor.BlockManager;

        /**
         * Editor is not focused
         */
        if (!currentBlock) {
          return;
        }

        /**
         * We allow to fire shortcut with empty selection (isCollapsed=true)
         * it can be used by tools like «Mention» that works without selection:
         * Example: by SHIFT+@ show dropdown and insert selected username
         */
        // if (SelectionUtils.isCollapsed) return;

        if (!currentBlock.tool.enabledInlineTools) {
          return;
        }

        event.preventDefault();

        this.popover?.activateItemByName(toolName);
      },
      on: this.Editor.UI.nodes.redactor,
    });
  }

  /**
   * Inline Tool button clicks
   *
   * @param tool - Tool's instance
   */
  private toolClicked(tool: IInlineTool): void {
    const range = SelectionUtils.range;

    tool.surround?.(range);
    this.checkToolsState();
  }

  /**
   * Check Tools` state by selection
   */
  private checkToolsState(): void {
    this.toolsInstances?.forEach((toolInstance) => {
      toolInstance.checkState?.(SelectionUtils.get());
    });
  }

  /**
   * Get inline tools tools
   * Tools that has isInline is true
   */
  private get triggerTools(): { [name: string]: IInlineTool } {
    const result = {} as  { [name: string]: IInlineTool } ;

    Array
      .from(this.Editor.Tools.inlineTools.entries())
      .forEach(([name, tool]) => {
        result[name] = tool.create();
      });

    return result;
  }
}
