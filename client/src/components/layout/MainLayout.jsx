import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import AppFooter from "./AppFooter.jsx";

export default function MainLayout() {
  return (
    <>
      <AppHeader />
      <Outlet />
      <AppFooter />
    </>
  );
}
