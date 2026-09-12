import { defineContract, enumType, member } from "@prisma/orm-postgres/contract-builder";

export const contract = defineContract({}, ({ field, model, rel }) => {
  const Role = enumType(
    "Role",
    {
      codecId: "pg/text@1",
      nativeType: "text",
    },
    member("teacher"),
    member("student"),
    member("admin"),
  );

  const DevicePlatform = enumType(
    "DevicePlatform",
    {
      codecId: "pg/text@1",
      nativeType: "text",
    },
    member("web"),
    member("android"),
    member("ios"),
    member("desktop"),
  );

  const User = model("User", {
    fields: {
      id: field.id.uuidv7Native(),
      email: field.text().unique(),
      name: field.text(),
      passwordHash: field.text(),
      image: field.text(),
      bio: field.text(),
      role: field.namedType(Role).default("student"),
      notifyOnNewMessage: field.boolean().default(true),
      sessionVersion: field.int().default(0),
      emailVerifiedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  const Device = model("Device", {
    fields: {
      id: field.id.uuidv7Native(),
      userId: field.uuidNative().unique(),
      deviceKey: field.text().unique(),
      platform: field.namedType(DevicePlatform),
      name: field.text().default("Unknown Device"),
      userAgent: field.text().default(""),
      ip: field.text().default("unknown"),
      lastSeenAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
    relations: {
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  const Session = model("Session", {
    fields: {
      id: field.id.uuidv7Native(),
      userId: field.uuidNative().unique(),
      deviceId: field.uuidNative().unique(),
      tokenHash: field.text().unique(),
      sessionVersion: field.int(),
      userAgent: field.text().default(""),
      ip: field.text().default("unknown"),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
      expiresAt: field.temporal.timestamptzString(),
      revokedAt: field.temporal.timestamptzString().optional(),
    },
    relations: {
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  const ResetToken = model("ResetToken", {
    fields: {
      id: field.id.uuidv7Native(),
      userId: field.uuidNative(),
      tokenHash: field.text(),
      attempts: field.int().default(0),
      expiresAt: field.temporal.timestamptzString(),
      usedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
    },
    relations: {
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  const EmailVerificationToken = model("EmailVerificationToken", {
    fields: {
      id: field.id.uuidv7Native(),
      userId: field.uuidNative(),
      tokenHash: field.text(),
      attempts: field.int().default(0),
      expiresAt: field.temporal.timestamptzString(),
      verifiedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
    },
    relations: {
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  const Notification = model("Notification", {
    fields: {
      id: field.id.uuidv7Native(),
      title: field.text(),
      body: field.text(),
      link: field.text().optional(),
      createdBy: field.uuidNative(),
      createdAt: field.temporal.createdAtString(),
    },
  });

  const NotificationRecipient = model("NotificationRecipient", {
    fields: {
      id: field.id.uuidv7Native(),
      notificationId: field.uuidNative(),
      userId: field.uuidNative(),
      readAt: field.temporal.timestamptzString().optional(),
      deletedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
    },
    relations: {
      notification: rel
        .belongsTo(Notification, { from: "notificationId", to: "id" })
        .sql({ fk: { onDelete: "cascade" } }),
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  const LoginEvent = model("LoginEvent", {
    fields: {
      id: field.id.uuidv7Native(),
      userId: field.uuidNative(),
      createdAt: field.temporal.createdAtString(),
    },
    relations: {
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  const RateLimit = model("RateLimit", {
    fields: {
      key: field.text().unique(),
      count: field.int(),
      windowStart: field.temporal.timestamptzString(),
      expiresAt: field.temporal.timestamptzString(),
    },
  });

  const Notification$ = Notification.relations({
    recipients: rel.hasMany(NotificationRecipient, { by: "notificationId" }),
  });

  const User$ = User.relations({
    device: rel.hasOne(Device, { by: "userId" }),
    session: rel.hasOne(Session, { by: "userId" }),
    notificationRecipients: rel.hasMany(NotificationRecipient, { by: "userId" }),
    loginEvents: rel.hasMany(LoginEvent, { by: "userId" }),
  });

  return {
    models: {
      User: User$,
      Device,
      Session,
      ResetToken,
      EmailVerificationToken,
      RateLimit,
      Notification: Notification$,
      NotificationRecipient,
      LoginEvent,
    },
    enums: {
      Role,
      DevicePlatform,
    },
  };
});
