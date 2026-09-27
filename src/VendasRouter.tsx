import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PedidoVendaCompleto from "./pages/PedidoVendaCompleto";
import VendasCentral from "./pages/VendasCentral";
import VendasCarteira from "./pages/VendasCarteira";
import VendasMetas from "./pages/VendasMetas";
import VendasDashboardGraficos from "./pages/VendasDashboardGraficos";
import VendasCatalogoDigital from "./pages/VendasCatalogoDigital";
import VendasAnaliseCustos from "./pages/VendasAnaliseCustos";

export default function VendasRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/vendas" element={<VendasCentral />} />
        <Route path="/comercial" element={<VendasCentral />} />
        <Route path="/vendas/novo-pedido" element={<PedidoVendaCompleto />} />
        <Route path="/vendas/clientes" element={<PedidoVendaCompleto />} />
        <Route path="/vendas/carteira" element={<VendasCarteira />} />
        <Route path="/vendas/metas" element={<VendasMetas />} />
        <Route path="/vendas/dashboard-graficos" element={<VendasDashboardGraficos />} />
        <Route path="/vendas/catalogo-digital" element={<VendasCatalogoDigital />} />
        <Route path="/vendas/analise-custos" element={<VendasAnaliseCustos />} />
        <Route path="/vendas/*" element={<Navigate to="/vendas" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
