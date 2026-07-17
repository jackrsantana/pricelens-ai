#!/bin/bash
sed -i -e '/<td className="px-4 py-3 text-right space-x-1.5">/,/<\/td>/c\
                          <td className="px-4 py-3 text-right space-x-1.5">\
                            <button\
                              onClick={() => handleOpenFlyerModal(f)}\
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer inline-flex"\
                              title="Editar informações do folheto"\
                            >\
                              <Edit className="w-3.5 h-3.5" />\
                            </button>\
                            <button\
                              onClick={() => handleDeleteFlyer(f.id)}\
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-flex"\
                              title="Excluir folheto permanentemente"\
                            >\
                              <Trash2 className="w-3.5 h-3.5" />\
                            </button>\
                          </td>' src/components/DashboardAdmin.tsx
