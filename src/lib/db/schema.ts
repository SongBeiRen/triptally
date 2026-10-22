import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  adminToken: text("admin_token").notNull(),
  budget: text("budget"),
  vibes: text("vibes").notNull().default("[]"),
  notes: text("notes"),
  deadline: integer("deadline"), // epoch ms, null = no decision deadline
  anonymize: integer("anonymize").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  isAdmin: integer("is_admin").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

/** A candidate window of dates, e.g. "Jun 5 → Jun 9". */
export const dateOptions = sqliteTable("date_options", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  label: text("label"),
  startDate: text("start_date").notNull(), // ISO yyyy-mm-dd
  endDate: text("end_date").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const dateVotes = sqliteTable(
  "date_votes",
  {
    optionId: text("option_id")
      .notNull()
      .references(() => dateOptions.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // "yes" | "maybe" | "no"
  },
  (t) => [primaryKey({ columns: [t.optionId, t.participantId] })],
);

export const destinations = sqliteTable("destinations", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  country: text("country"),
  blurb: text("blurb"),
  createdAt: integer("created_at").notNull(),
});

/** value: 2 = love it, 1 = into it, -1 = hard pass (no row = hasn't voted). */
export const destinationVotes = sqliteTable(
  "destination_votes",
  {
    destinationId: text("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.destinationId, t.participantId] })],
);

export const places = sqliteTable("places", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(), // food | drink | sight | activity | nightlife
  note: text("note"),
  addedBy: text("added_by"), // participant id (no FK: we never delete participants)
  createdAt: integer("created_at").notNull(),
});

export const placeVotes = sqliteTable(
  "place_votes",
  {
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.placeId, t.participantId] })],
);

/** A generated day-by-day plan. payload holds the Itinerary JSON. */
export const itineraries = sqliteTable("itineraries", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  generatedBy: text("generated_by").notNull(), // "ai" | "fallback"
  destination: text("destination").notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull(),
});
