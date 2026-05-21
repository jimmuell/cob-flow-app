export interface Tenant {
  id: string;
  name: string;
  mode: string;
}

export const TENANTS: Tenant[] = [
  { id: "t_carrier", name: "Lakeshore Health Plan (WI)", mode: "Carrier in-house" },
  { id: "t_vendor", name: "Badger State Subrogation Services", mode: "Subrogation vendor / TPA" },
  { id: "t_indie", name: "COB Flow Recovery — Brookfield", mode: "Independent vendor service" },
];
