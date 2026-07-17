import re

with open('src/components/DashboardAdmin.tsx', 'r') as f:
    text = f.read()

# I need to add state for sidebar: const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
state_idx = text.find('const [activeSubTab, setActiveSubTab]')
text = text[:state_idx] + "const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);\n  " + text[state_idx:]

# Also need to import Menu, X if not imported
import_lucide = re.search(r"import \{([^}]+)\} from 'lucide-react';", text)
if import_lucide:
    imports = import_lucide.group(1)
    if 'Menu' not in imports: imports += ', Menu'
    if 'X' not in imports: imports += ', X'
    text = text[:import_lucide.start(1)] + imports + text[import_lucide.end(1):]

# Now, replace the rendering of the Sidebar
# Find the start of the grid structure
grid_start = text.find('{/* Grid structure: Left Sub-navigation Tabs, Right Dynamic Render stage */}')
grid_end_search = text.find('</div>', grid_start)
# actually, it's better to just replace the whole nav panel.

nav_panel_start = text.find('{/* Left Side Navigation Menu panel */}')
nav_panel_end = text.find('{/* Right Dynamic Stage */}', nav_panel_start)

replacement = """
        {/* Mobile Header / Hamburger */}
        <div className="lg:hidden flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            {subTabs.find(t => t.id === activeSubTab)?.icon}
            {subTabs.find(t => t.id === activeSubTab)?.label}
          </div>
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 bg-slate-100 text-slate-600 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Left Side Navigation Menu panel */}
        <div className={`
          fixed lg:static inset-y-0 right-0 z-50 w-72 lg:w-auto bg-white lg:bg-transparent lg:border-none shadow-2xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out lg:transform-none lg:transition-none
          ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          lg:col-span-3 h-full overflow-y-auto lg:overflow-visible
        `}>
          <div className="bg-white lg:rounded-3xl lg:border lg:border-slate-100 lg:shadow-sm p-4 lg:p-4 min-h-full">
            <div className="flex justify-between items-center mb-6 lg:hidden">
              <h3 className="font-bold text-slate-800">Menu</h3>
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 bg-slate-100 text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex flex-col gap-1">
              {subTabs.map(tab => {
                const isDanger = tab.id === 'danger';
                return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSubTab(tab.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`text-left px-4 py-3 lg:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    activeSubTab === tab.id
                      ? (isDanger ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700')
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`${activeSubTab === tab.id ? (isDanger ? 'text-rose-600' : 'text-indigo-600') : 'text-slate-400'}`}>
                    {tab.icon}
                  </div>
                  {tab.label}
                </button>
                );
              })}
            </nav>
          </div>
        </div>

"""

text = text[:nav_panel_start] + replacement + text[nav_panel_end:]

# The danger zone logic right now is highlighted in red permanently. Wait, we need to change it so it's NOT permanently red.
# "O item deve utilizar a mesma identidade visual dos demais itens da navegação. Apenas o conteúdo interno da seção "Zona de Perigo" poderá utilizar elementos visuais de alerta quando realmente necessário."
# So I should remove the isDanger conditional!

replacement = replacement.replace("isDanger ?", "false ?")

text = text[:nav_panel_start] + replacement + text[nav_panel_end:]

with open('src/components/DashboardAdmin.tsx', 'w') as f:
    f.write(text)

