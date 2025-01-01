/** ./api */
import BlocksAPI from './api/blocks';
import CaretAPI from './api/caret';
import EventsAPI from './api/events';
import I18nAPI from './api/i18n';
import API from './api/index';
import InlineToolbarAPI from './api/inlineToolbar';
import ListenersAPI from './api/listeners';
import NotifierAPI from './api/notifier';
import ReadOnlyAPI from './api/readonly';
import SanitizerAPI from './api/sanitizer';
import SaverAPI from './api/saver';
import SelectionAPI from './api/selection';
import ToolsAPI from './api/tools';
import StylesAPI from './api/styles';
import ToolbarAPI from './api/toolbar';
import TooltipAPI from './api/tooltip';
import UiAPI from './api/ui';

/** ./toolbar */
import BlockSettings from './toolbar/blockSettings';
import Toolbar from './toolbar/index';
import InlineToolbar from './toolbar/inline';

/** . */
import BlockEvents from './blockEvents';
import BlockManager from './blockManager';
import BlockSelection from './blockSelection';
import Caret from './caret';
import CrossBlockSelection from './crossBlockSelection';
import DragNDrop from './dragNDrop';
import ModificationsObserver from './modificationsObserver';
import Paste from './paste';
import ReadOnly from './readonly';
import RectangleSelection from './rectangleSelection';
import Renderer from './renderer';
import Saver from './saver';
import Tools from './tools';
import UI from './ui';
import TriggerInputAPI from './api/triggerInput';
import TriggerInputTool from './toolbar/triggerInput';

export default {
  // API Modules  API 提供给外部使用的。具体实现是在 Modules 和 Toolbar中
  BlocksAPI,
  CaretAPI,
  EventsAPI,
  I18nAPI,
  API,
  InlineToolbarAPI,
  ListenersAPI,
  NotifierAPI,
  ReadOnlyAPI,
  SanitizerAPI,
  SaverAPI,
  SelectionAPI,
  ToolsAPI,
  StylesAPI,
  ToolbarAPI,
  TooltipAPI,
  UiAPI,
  TriggerInputAPI,

  // Toolbar Modules
  BlockSettings,
  Toolbar,
  InlineToolbar,
  TriggerInputTool,


  // Modules
  BlockEvents,
  BlockManager,
  BlockSelection,
  Caret,
  CrossBlockSelection,
  DragNDrop,
  ModificationsObserver,
  Paste,
  ReadOnly,
  RectangleSelection,
  Renderer,
  Saver,
  Tools,
  UI,
};
