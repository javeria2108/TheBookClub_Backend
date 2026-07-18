CREATE UNIQUE INDEX "ReadingCycle_one_active_per_club_idx"
ON "ReadingCycle"("clubId")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "ReadingCycle_one_planned_per_club_idx"
ON "ReadingCycle"("clubId")
WHERE "status" = 'PLANNED';
