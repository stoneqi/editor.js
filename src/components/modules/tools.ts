import Paragraph from '../block-tools/paragraph';
import Header from '../block-tools/header';
import ImageTool from '../block-tools/image';
import EditorjsList from '../block-tools/list';
import Module from '../__module';
import * as _ from '../utils';
import type { SanitizerConfig, ToolConfig, ToolConstructable, ToolSettings } from '../../../types';
import BoldInlineTool from '../inline-tools/inline-tool-bold';
import ItalicInlineTool from '../inline-tools/inline-tool-italic';
import LinkInlineTool from '../inline-tools/inline-tool-link';
import TagInlineTool from '../inline-tools/inline-tool-tag';
import ConvertInlineTool from '../inline-tools/inline-tool-convert';
import Stub from '../../tools/stub';
import ToolsFactory from '../tools/factory';
import type InlineToolAdapter from '../tools/inline';
import type BlockToolAdapter from '../tools/block';
import type BlockTuneAdapter from '../tools/tune';
import MoveDownTune from '../block-tunes/block-tune-move-down';
import DeleteTune from '../block-tunes/block-tune-delete';
import MoveUpTune from '../block-tunes/block-tune-move-up';
import ToolsCollection from '../tools/collection';

/**
 * @module Editor.js Tools Submodule
 *
 * Creates Instances from Plugins and binds external config to the instances
 */

/**
 * Modules that works with tools classes
 */
export default class Tools extends Module {
  /**
   * Name of Stub Tool
   * Stub Tool is used to substitute unavailable block Tools and store their data
   *
   * @type {string}
   */
  public stubTool = 'stub';

  /**
   * Returns available Tools
   */
  public get available(): ToolsCollection {
    return this.toolsAvailable;
  }

  /**
   * Returns unavailable Tools
   */
  public get unavailable(): ToolsCollection {
    return this.toolsUnavailable;
  }

  /**
   * Return Tools for the Inline Toolbar
   */
  public get inlineTools(): ToolsCollection<InlineToolAdapter> {
    return this.available.inlineTools;
  }

  /**
   * Return editor block tools
   */
  public get blockTools(): ToolsCollection<BlockToolAdapter> {
    return this.available.blockTools;
  }

  /**
   * Return available Block Tunes
   *
   * @returns {object} - object of Inline Tool's classes
   */
  public get blockTunes(): ToolsCollection<BlockTuneAdapter> {
    return this.available.blockTunes;
  }

  /**
   * Returns default Tool object
   */
  public get defaultTool(): BlockToolAdapter {
    return this.blockTools.get(this.config.defaultBlock);
  }

  /**
   * Tools objects factory
   */
  private factory: ToolsFactory;

  /**
   * Tools` classes available to use
   */
  private readonly toolsAvailable: ToolsCollection = new ToolsCollection();

  /**
   * Tools` classes not available to use because of preparation failure
   */
  private readonly toolsUnavailable: ToolsCollection = new ToolsCollection();

  /**
   * Returns internal tools
   */
  public get internal(): ToolsCollection {
    return this.available.internalTools;
  }

  /**
   * Creates instances via passed or default configuration
   *
   * @returns {Promise<void>}
   */
  // 创建所有的 tool 及对应的 inline-tool 和 BlockTunes
  public async prepare(): Promise<void> {
    this.validateTools();

    /**
     * Assign internal tools
     */
    // merge 内置的配置和上传的配置
    this.config.tools = _.deepMerge({}, this.internalTools, this.config.tools);

    if (!Object.prototype.hasOwnProperty.call(this.config, 'tools') || Object.keys(this.config.tools).length === 0) {
      throw Error('Can\'t start without tools');
    }

    const config = this.prepareConfig();

    // 实例化 tools 工厂
    this.factory = new ToolsFactory(config, this.config, this.Editor.API);

    /**
     * getting classes that has prepare method
     */
    // 获得每个 tools 需要  prepare 执行的函数
    const sequenceData = this.getListOfPrepareFunctions(config);

    /**
     * if sequence data contains nothing then resolve current chain and run other module prepare
     */
    if (sequenceData.length === 0) {
      return Promise.resolve();
    }

    /**
     * to see how it works {@link '../utils.ts#sequence'}
     */
    await _.sequence(sequenceData, (data: { toolName: string }) => {
      this.toolPrepareMethodSuccess(data);
    }, (data: { toolName: string }) => {
      this.toolPrepareMethodFallback(data);
    });

    this.prepareBlockTools();
  }

  /**
   * Return general Sanitizer config for all inline tools
   */
  @_.cacheable
  public getAllInlineToolsSanitizeConfig(): SanitizerConfig {
    const config: SanitizerConfig = {} as SanitizerConfig;

    Array.from(this.inlineTools.values())
      .forEach(inlineTool => {
        Object.assign(config, inlineTool.sanitizeConfig);
      });

    return config;
  }

  /**
   * Calls each Tool reset method to clean up anything set by Tool
   */
  public destroy(): void {
    Object.values(this.available).forEach(async tool => {
      if (_.isFunction(tool.reset)) {
        await tool.reset();
      }
    });
  }

  /**
   * Returns internal tools
   * Includes Bold, Italic, Link and Paragraph
   */
  private get internalTools(): { [toolName: string]: ToolConstructable | ToolSettings & { isInternal?: boolean } } {
    return {
      convertTo: {
        class: ConvertInlineTool,
        isInternal: true,
      },
      tag: {
        class: TagInlineTool,
        isInternal: true,
      },
      link: {
        class: LinkInlineTool,
        isInternal: true,
      },
      bold: {
        class: BoldInlineTool,
        isInternal: true,
      },
      italic: {
        class: ItalicInlineTool,
        isInternal: true,
      },
      paragraph: {
        class: Paragraph,
        inlineToolbar: true,
        isInternal: true,
      },
      stub: {
        class: Stub,
        isInternal: true,
      },
      moveUp: {
        class: MoveUpTune,
        isInternal: true,
      },
      delete: {
        class: DeleteTune,
        isInternal: true,
      },
      moveDown: {
        class: MoveDownTune,
        isInternal: true,
      },
      header: {
        class: Header,
        inlineToolbar: true,
        config: {
          placeholder: 'Enter a header',
          levels: [1, 2, 3, 4, 5],
          defaultLevel: 3,
        },
      },

      /**
       * Or pass class directly without any configuration
       */
      image: {
        class: ImageTool,
        config: {
          endpoints: {
            byFile: 'http://localhost:8008/uploadFile', // Your backend file uploader endpoint
            byUrl: 'http://localhost:8008/fetchUrl', // Your endpoint that provides uploading by Url
          },
        },
      },

      list: {
        class: EditorjsList,
        inlineToolbar: true,
        config: {
          defaultStyle: 'unordered',
        },
      },
    };
  }

  /**
   * Tool prepare method success callback
   *
   * @param {object} data - append tool to available list
   */
  private toolPrepareMethodSuccess(data: { toolName: string }): void {
    const tool = this.factory.get(data.toolName);

    if (tool.isInline()) {
      /**
       * Some Tools validation
       */
      const inlineToolRequiredMethods = [ 'render' ];
      const notImplementedMethods = inlineToolRequiredMethods.filter((method) => !tool.create()[method]);

      if (notImplementedMethods.length) {
        _.log(
          `Incorrect Inline Tool: ${tool.name}. Some of required methods is not implemented %o`,
          'warn',
          notImplementedMethods
        );

        this.toolsUnavailable.set(tool.name, tool);

        return;
      }
    }

    this.toolsAvailable.set(tool.name, tool);
  }

  /**
   * Tool prepare method fail callback
   *
   * @param {object} data - append tool to unavailable list
   */
  private toolPrepareMethodFallback(data: { toolName: string }): void {
    this.toolsUnavailable.set(data.toolName, this.factory.get(data.toolName));
  }

  /**
   * Binds prepare function of plugins with user or default config
   *
   * @returns {Array} list of functions that needs to be fired sequentially
   * @param config - tools config
   */
  private getListOfPrepareFunctions(config: {[name: string]: ToolSettings}): {
    function: (data: { toolName: string; config: ToolConfig }) => void | Promise<void>;
    data: { toolName: string; config: ToolConfig };
  }[] {
    const toolPreparationList: {
      function: (data: { toolName: string }) => void | Promise<void>;
      data: { toolName: string; config: ToolConfig };
    }[] = [];

    Object
      .entries(config)
      .forEach(([toolName, settings]) => {
        toolPreparationList.push({
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          function: _.isFunction(settings.class.prepare) ? settings.class.prepare : (): void => {},
          data: {
            toolName,
            config: settings.config,
          },
        });
      });

    return toolPreparationList;
  }

  /**
   * Assign enabled Inline Tools and Block Tunes for Block Tool
   */
  private prepareBlockTools(): void {
    Array.from(this.blockTools.values()).forEach(tool => {
      this.assignInlineToolsToBlockTool(tool);
      this.assignBlockTunesToBlockTool(tool);
    });
  }

  /**
   * Assign enabled Inline Tools for Block Tool
   *
   * @param tool - Block Tool
   */
  private assignInlineToolsToBlockTool(tool: BlockToolAdapter): void {
    /**
     * If common inlineToolbar property is false no Inline Tools should be assigned
     */
    if (this.config.inlineToolbar === false) {
      return;
    }

    /**
     * If user pass just 'true' for tool, get common inlineToolbar settings
     * - if common settings is an array, use it
     * - if common settings is 'true' or not specified, get default order
     */
    if (tool.enabledInlineTools === true) {
      tool.inlineTools = new ToolsCollection<InlineToolAdapter>(
        Array.isArray(this.config.inlineToolbar)
          ? this.config.inlineToolbar.map(name => [name, this.inlineTools.get(name)])
          /**
           * If common settings is 'true' or not specified (will be set as true at core.ts), get the default order
           */
          : Array.from(this.inlineTools.entries())
      );

      return;
    }

    /**
     * If user pass the list of inline tools for the particular tool, return it.
     */
    if (Array.isArray(tool.enabledInlineTools)) {
      tool.inlineTools = new ToolsCollection<InlineToolAdapter>(
        /** Prepend ConvertTo Inline Tool */
        ['convertTo', ...tool.enabledInlineTools].map(name => [name, this.inlineTools.get(name)])
      );
    }
  }

  /**
   * Assign enabled Block Tunes for Block Tool
   *
   * @param tool — Block Tool
   */
  private assignBlockTunesToBlockTool(tool: BlockToolAdapter): void {
    if (tool.enabledBlockTunes === false) {
      return;
    }

    if (Array.isArray(tool.enabledBlockTunes)) {
      const userTunes = new ToolsCollection<BlockTuneAdapter>(
        tool.enabledBlockTunes.map(name => [name, this.blockTunes.get(name)])
      );

      tool.tunes = new ToolsCollection<BlockTuneAdapter>([...userTunes, ...this.blockTunes.internalTools]);

      return;
    }

    if (Array.isArray(this.config.tunes)) {
      const userTunes = new ToolsCollection<BlockTuneAdapter>(
        this.config.tunes.map(name => [name, this.blockTunes.get(name)])
      );

      tool.tunes = new ToolsCollection<BlockTuneAdapter>([...userTunes, ...this.blockTunes.internalTools]);

      return;
    }

    tool.tunes = this.blockTunes.internalTools;
  }

  /**
   * Validate Tools configuration objects and throw Error for user if it is invalid
   */
  private validateTools(): void {
    /**
     * Check Tools for a class containing
     */
    for (const toolName in this.config.tools) {
      if (Object.prototype.hasOwnProperty.call(this.config.tools, toolName)) {
        if (toolName in this.internalTools) {
          return;
        }

        const tool = this.config.tools[toolName];

        if (!_.isFunction(tool) && !_.isFunction((tool as ToolSettings).class)) {
          throw Error(
            `Tool «${toolName}» must be a constructor function or an object with function in the «class» property`
          );
        }
      }
    }
  }

  /**
   * Unify tools config
   */
  private prepareConfig(): {[name: string]: ToolSettings} {
    const config: {[name: string]: ToolSettings} = {};

    /**
     * Save Tools settings to a map
     */
    for (const toolName in this.config.tools) {
      /**
       * If Tool is an object not a Tool's class then
       * save class and settings separately
       */
      if (_.isObject(this.config.tools[toolName])) {
        config[toolName] = this.config.tools[toolName] as ToolSettings;
      } else {
        config[toolName] = { class: this.config.tools[toolName] as ToolConstructable };
      }
    }

    return config;
  }
}
