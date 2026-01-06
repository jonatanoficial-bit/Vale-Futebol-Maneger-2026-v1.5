export const FORMATIONS = [
  {
    id: "4-3-3",
    name: "4-3-3",
    roles: [
      { key: "GK", label: "Goleiro", allowed: ["GK"] },

      { key: "RB", label: "LD", allowed: ["RB", "RWB"] },
      { key: "RCB", label: "ZAG D", allowed: ["CB"] },
      { key: "LCB", label: "ZAG E", allowed: ["CB"] },
      { key: "LB", label: "LE", allowed: ["LB", "LWB"] },

      { key: "RCM", label: "MC D", allowed: ["CM", "CDM", "RM"] },
      { key: "CM", label: "MC", allowed: ["CM", "CDM", "CAM"] },
      { key: "LCM", label: "MC E", allowed: ["CM", "CDM", "LM"] },

      { key: "RW", label: "PD", allowed: ["RW", "RM"] },
      { key: "ST", label: "ATA", allowed: ["ST", "CF"] },
      { key: "LW", label: "PE", allowed: ["LW", "LM"] }
    ],
    benchSize: 7
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    roles: [
      { key: "GK", label: "Goleiro", allowed: ["GK"] },

      { key: "RB", label: "LD", allowed: ["RB", "RWB"] },
      { key: "RCB", label: "ZAG D", allowed: ["CB"] },
      { key: "LCB", label: "ZAG E", allowed: ["CB"] },
      { key: "LB", label: "LE", allowed: ["LB", "LWB"] },

      { key: "RDM", label: "VOL D", allowed: ["CDM", "CM"] },
      { key: "LDM", label: "VOL E", allowed: ["CDM", "CM"] },

      { key: "RAM", label: "MEI D", allowed: ["RM", "RW", "CAM"] },
      { key: "CAM", label: "MEI", allowed: ["CAM", "CM"] },
      { key: "LAM", label: "MEI E", allowed: ["LM", "LW", "CAM"] },

      { key: "ST", label: "ATA", allowed: ["ST", "CF"] }
    ],
    benchSize: 7
  }
];

export function formationById(id) {
  return FORMATIONS.find(f => f.id === id) || FORMATIONS[0];
}

export function roleKeysForFormation(id) {
  return formationById(id).roles.map(r => r.key);
}

export function roleSpec(id, roleKey) {
  const f = formationById(id);
  return f.roles.find(r => r.key === roleKey) || null;
}