with open('src/components/DashboardAdmin.tsx', 'r') as f:
    text = f.read()

import re

# We want to replace everything from the first {/* Mobile Header / Hamburger */} 
# to the start of {/* Right Dynamic Stage */} with our correct sidebar.

start_tag = "{/* Grid structure: Left Sub-navigation Tabs, Right Dynamic Render stage */}\n      <div className=\"grid grid-cols-1 lg:grid-cols-12 gap-6\">\n"
start_idx = text.find(start_tag) + len(start_tag)

end_tag = "{/* Right Dynamic Stage */}"
end_idx = text.find(end_tag, start_idx)

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
          fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-auto bg-white lg:bg-transparent lg:border-none shadow-2xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out lg:transform-none lg:transition-none
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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
                return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSubTab(tab.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`text-left px-4 py-3 lg:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    activeSubTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`${activeSubTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`}>
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

new_text = text[:start_idx] + replacement + text[end_idx:]

with open('src/components/DashboardAdmin.tsx', 'w') as f:
    f.write(new_text)

