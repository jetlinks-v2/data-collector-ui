import i18n from '@jetlinks-web-core/locales'
import { registerDocumentHelpPoints } from '@jetlinks-web-core/utils/documentHelpRegistry'

export function registerCollectorHelpPoints() {
  registerDocumentHelpPoints([
    ['channel.gateway', 'gateway', 'channelEditor'],
    ['collector.channel', 'channel', 'collectorEditor'],
    ['point.collector', 'collector', 'pointEditor'],
    ['collection.interval', 'interval', 'collectionSettings'],
  ].map(([key, name, location]) => ({
    code: 'data-collect', key,
    name: () => i18n.global.t(`CollectorDocumentHelp.${name}`),
    page: () => i18n.global.t('CollectorDocumentHelp.page'),
    location: () => i18n.global.t(`CollectorDocumentHelp.${location}`),
  })))
}
