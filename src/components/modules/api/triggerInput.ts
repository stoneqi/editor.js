import Module from '../../__module';
import type { ModuleConfig } from '../../../types-internal/module-config';
import type { TriggerInput } from '@/types/api/trigger-input';
/**
 * @class TriggerInputAPI
 * @classdesc TriggerInput API
 */
export default class TriggerInputAPI extends Module {
  /**
   * @class
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
   * Available methods
   */
  public get methods(): TriggerInput {
    return {
      getTriggerRange: (): Range | null => this.getTriggerRange(),
    };
  }

  /**
   * Method show tooltip on element with passed HTML content
   *
   * @param {HTMLElement} element - element on which tooltip should be shown
   * @param {TooltipContent} content - tooltip content
   * @param {TooltipOptions} options - tooltip options
   */
  public getTriggerRange(): Range |null {
    return this.Editor.TriggerInputTool.getTriggerRange();
  }
}
