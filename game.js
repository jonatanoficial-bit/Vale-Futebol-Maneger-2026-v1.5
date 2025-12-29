ensureWorld() {
  const slot = this.state.slot;
  const save = this.readSlot(slot);
  if (!save) return null;

  if (!save.world || !save.world.calendar || !save.world.calendar.days) {
    const year = this.state.packData?.defaultSeasonYear || 2026;
    const cal = NS.Engine.Calendar.buildBR(year);
    save.world = save.world || {};
    save.world.calendar = cal;
    save.world.dayIndex = 0;
    save.updatedAt = new Date().toISOString();
    this.writeSlot(slot, save);
  }

  this.state.save = save;
  return save.world;
},

advanceDay() {
  const slot = this.state.slot;
  const save = this.readSlot(slot);
  if (!save?.world?.calendar?.days) return false;

  const max = save.world.calendar.days.length - 1;
  save.world.dayIndex = Math.min(max, (save.world.dayIndex || 0) + 1);
  save.updatedAt = new Date().toISOString();
  this.writeSlot(slot, save);
  this.state.save = save;
  return true;
},

getToday() {
  const save = this.state.save || this.readSlot(this.state.slot);
  const world = save?.world;
  const cal = world?.calendar;
  const idx = world?.dayIndex || 0;
  const day = cal?.days?.[idx];
  return { dayIndex: idx, day };
},

getNextMatchday() {
  const save = this.state.save || this.readSlot(this.state.slot);
  const cal = save?.world?.calendar;
  const now = save?.world?.dayIndex || 0;
  if (!cal?.days) return null;

  for (let i = now; i < cal.days.length; i++) {
    const ev = cal.days[i].events?.find(e => e.type === 'matchday');
    if (ev) return { dayIndex: i, event: ev };
  }
  return null;
}