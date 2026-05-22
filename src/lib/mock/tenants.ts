export interface Tenant {
  id: string;
  name: string;
  mode: string;
  features: { content_manager: boolean };
}

export const TENANTS: Tenant[] = [
  { id: "t_carrier", name: "Lakeshore Health Plan (WI)", mode: "Carrier in-house", features: { content_manager: true } },
  { id: "t_vendor", name: "Badger State Subrogation Services", mode: "Subrogation vendor / TPA", features: { content_manager: true } },
  { id: "t_indie", name: "COB Flow Recovery — Brookfield", mode: "Independent vendor service", features: { content_manager: true } },
];
