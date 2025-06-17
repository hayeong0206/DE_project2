import React from "react";
import { Navbar, NavbarBrand } from "reactstrap";
import logo from "./assets/logo.png";

export default function NavBar() {
  return (
    <Navbar color="light" light expand="md" className="mb-4 shadow-sm">
      <NavbarBrand href="/">
        <img
          src={logo}
          alt="Walk Guardians"
          style={{ height: 40, marginRight: 8 }}
        />
        위험도 예측기
      </NavbarBrand>
    </Navbar>
  );
}