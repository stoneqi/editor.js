import { PopoverItemParams } from './popover-item';
import { PopoverEvent } from './popover-event';

/**
 * Params required to render popover
 */
export interface PopoverParams {
  /**
   * Popover items config
   */
  items: PopoverItemParams[];

  /**
   * Element of the page that creates 'scope' of the popover.
   * Depending on its size popover position will be calculated
   */
  // 创建弹出框的页面元素。根据其大小，将计算弹出框的位置。保证弹出框不会超出页面范围
  scopeElement?: HTMLElement;

  /**
   * True if popover should contain search field
   */
  // 是否可搜索
  searchable?: boolean;

  /**
   * False if keyboard navigation should be disabled.
   * True by default
   */
  // 是否可键盘导航
  flippable?: boolean;

  /**
   * Popover texts overrides
   */
  // 弹出框文本覆盖
  messages?: PopoverMessages

  /**
   * CSS class name for popover root element
   */
  // 弹出框根元素的 CSS 类名
  class?: string;

  /**
   * Popover nesting level. 0 value means that it is a root popover
   */
  // 弹出框嵌套级别。0 表示根弹出框
  nestingLevel?: number;
}


/**
 * Texts used inside popover
 */
export interface PopoverMessages {
  /** Text displayed when search has no results */
  nothingFound?: string;

  /** Search input label */
  search?: string
}


/**
 * Events fired by the Popover
 */
export interface PopoverEventMap {
  /**
   * Fired when popover closes
   */
  [PopoverEvent.Closed]: undefined;

  /**
   * Fired when popover closes because item with 'closeOnActivate' property set was clicked
   * Value is the item that was clicked
   */
  [PopoverEvent.ClosedOnActivate]: undefined;
}

/**
 * HTML elements required to display popover
 */
export interface PopoverNodes {
  /** Root popover element */
  popover: HTMLElement;

  /** Wraps all the visible popover elements, has background and rounded corners */
  popoverContainer: HTMLElement;

  /** Message displayed when no items found while searching */
  nothingFoundMessage: HTMLElement;

  /** Popover items wrapper */
  items: HTMLElement;
}

/**
 * HTML elements required to display mobile popover
 */
export interface PopoverMobileNodes extends PopoverNodes {
  /** Popover header element */
  header: HTMLElement;

  /** Overlay, displayed under popover on mobile */
  overlay: HTMLElement;
}
