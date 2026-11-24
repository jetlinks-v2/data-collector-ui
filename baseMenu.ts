import baseMenu from './baseMenu.json'
import { id } from './package.json'

// Match the runtime module menu contract; JSON alone is used for translations, not registration.
const withModule = (menus: typeof baseMenu): unknown[] => menus.map(item => ({
  ...item,
  options: { appName: id },
  children: item.children?.map(child => ({ ...child, options: { appName: id } })),
}))

export default () => withModule(baseMenu)
