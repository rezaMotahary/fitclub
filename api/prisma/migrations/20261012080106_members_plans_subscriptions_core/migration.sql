-- Members / plans / subscriptions core fields + club settings (applied earlier; restored for git)

ALTER TABLE "Member" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Payment" ADD COLUMN "subscriptionId" TEXT;

ALTER TABLE "Subscription" ADD COLUMN "amountPaidToman" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "discountPercentApplied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "priceToman" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ClubSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "earlyRenewalDiscountPercent" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionSchedule" JSONB NOT NULL DEFAULT '{"men": {"fri": {"open": "16:00", "close": "21:00"}, "mon": {"open": "15:00", "close": "23:00"}, "sat": {"open": "15:00", "close": "23:00"}, "sun": {"open": "15:00", "close": "23:00"}, "thu": {"open": "15:00", "close": "22:00"}, "tue": {"open": "15:00", "close": "23:00"}, "wed": {"open": "15:00", "close": "23:00"}}, "women": {"fri": {"open": null, "close": null}, "mon": {"open": "07:00", "close": "14:30"}, "sat": {"open": "07:00", "close": "14:30"}, "sun": {"open": "07:00", "close": "14:30"}, "thu": {"open": "07:00", "close": "13:30"}, "tue": {"open": "07:00", "close": "14:30"}, "wed": {"open": "07:00", "close": "14:30"}}}',

    CONSTRAINT "ClubSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
