import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, Package, ShoppingCart, FileText, BarChart3, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import Ingredients from "./Ingredients";
import Purchases from "./Purchases";
import Products from "./Products";
import Reports from "./Reports";

export default function Dashboard({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    toast.success("Logout realizado!");
  };

  const tabs = [
    { path: "/", label: "Ingredientes", icon: Package },
    { path: "/compras", label: "Compras", icon: ShoppingCart },
    { path: "/produtos", label: "Produtos", icon: FileText },
    { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-rose-700 p-2 rounded-lg">
              <ChefHat className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">Gestão Point</h1>
              <p className="text-xs text-slate-400">do Addad</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                data-testid={`nav-${tab.label.toLowerCase()}`}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-rose-700 text-white font-medium shadow-lg"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="w-5 h-5 mr-3" strokeWidth={1.5} />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Ingredients />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/relatorios" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}