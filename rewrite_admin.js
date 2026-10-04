const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// Replace AdminTab
code = code.replace(
  /export type AdminTab =[\s\S]*?\| "avatars";/,
  `export const TAB_DEFINITIONS = [
  { id: "metricas", label: "📊 Métricas & Desempenho", perm: "metrics_view", icon: BarChart3 },
  { id: "complementos", label: "🍨 Complementos", perm: "menu_manage", icon: IceCream },
  { id: "combos", label: "⚡ Combos", perm: "menu_manage", icon: Zap },
  { id: "promocoes", label: "🏷️ Promoções", perm: "promotions_manage", icon: Tag },
  { id: "cupons", label: "🎟️ Cupons", perm: "coupons_manage", icon: Ticket },
  { id: "identidade_visual", label: "🎨 Identidade Visual", perm: "theme_manage", icon: Palette },
  { id: "canais_atendimento", label: "📞 Canais & Atendimento", perm: "settings_manage", icon: MessageCircle },
  { id: "configuracoes", label: "⚙️ Configurações", perm: "settings_manage", icon: Store },
  { id: "horarios", label: "⏰ Horários de Funcionamento", perm: "settings_manage", icon: Clock },
  { id: "zonas_entrega", label: "🚚 Zonas de Entrega", perm: "settings_manage", icon: Truck },
  { id: "usuarios", label: "👥 Usuários", perm: "users_manage", icon: User },
] as const;

export type AdminTab = typeof TAB_DEFINITIONS[number]["id"];`
);

// Replace useState
code = code.replace(
  /const \[activeTab, setActiveTab\] = useState<AdminTab>\("metrics"\);/,
  `const visibleTabs = TAB_DEFINITIONS.filter(tab => isAdmin || canAccess(tab.perm as PermissionKey));
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    return (visibleTabs[0]?.id as AdminTab) || "complementos";
  });`
);

// Replace useEffect Auth/Tab check
code = code.replace(
  /\} else if \(isEditor && !isAdmin\) \{[\s\S]*?router\.push\("\/admin\/pedidos\?unauthorized=true"\);\s*\}\s*\}/,
  `} else if (isEditor && !isAdmin) {
      if (!visibleTabs.find(t => t.id === activeTab)) {
        if (visibleTabs.length > 0) {
          setActiveTab(visibleTabs[0].id);
        } else {
          router.push("/admin/pedidos?unauthorized=true");
        }
      }
    }`
);

// Replace Tabs rendering loop
// Find the <div className="flex flex-wrap items-center gap-2... "> and replace its children
const tabGroupRegex = /<div className="flex flex-wrap items-center gap-2 p-1\.5 bg-white dark:bg-\[#230E26\] border border-gray-200 dark:border-border\/40 rounded-2xl shadow-xs">([\s\S]*?)<\/div>\s*\{\/\* CONTEÚDO DA ABA 1:/;

code = code.replace(
  tabGroupRegex,
  `<div className="flex overflow-x-auto items-center gap-2 p-1.5 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl shadow-xs scrollbar-hide">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  let badge = null;
                  
                  if (tab.id === "combos") badge = combos.length;
                  if (tab.id === "promocoes") badge = directPromos.length;
                  if (tab.id === "banners") badge = bannerPromos.length + 1;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={\`whitespace-nowrap flex items-center gap-2 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer \${
                        activeTab === tab.id
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }\`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                      {badge !== null && (
                        <span
                          className={\`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold \${
                            activeTab === tab.id
                              ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }\`}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* CONTEÚDO DA ABA 1:`
);

// Replace content condition names
code = code.replace(/activeTab === "metrics"/g, 'activeTab === "metricas"');
code = code.replace(/activeTab === "addons"/g, 'activeTab === "complementos"');
code = code.replace(/activeTab === "promotions"/g, 'activeTab === "promocoes"');
code = code.replace(/activeTab === "coupons"/g, 'activeTab === "cupons"');
code = code.replace(/activeTab === "appearance"/g, 'activeTab === "identidade_visual"');
code = code.replace(/activeTab === "channels"/g, 'activeTab === "canais_atendimento"');
code = code.replace(/activeTab === "logistics" \|\| activeTab === "delivery"/g, 'activeTab === "zonas_entrega"');

fs.writeFileSync('src/app/admin/page.tsx', code);
console.log('Admin page rewrited!');
