import {
  defineContract,
  enumType,
  member,
} from "@prisma/orm-postgres/contract-builder";

export const contract = defineContract({}, ({ field, model }) => {
  // ============================================================
  // Enums
  // ============================================================

  const Role = enumType(
    "Role",
    {
      codecId: "pg/text@1",
      nativeType: "text",
    },
    member("teacher"),
    member("student"),
  );

  const OnlineStatus = enumType(
    "OnlineStatus",
    {
      codecId: "pg/text@1",
      nativeType: "text",
    },
    member("online"),
    member("offline"),
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

  // ============================================================
  // User
  // ============================================================

  const User = model("User", {
    fields: {
      /**
       * Primary Key
       */
      id: field.id.uuidv7String(),

      /**
       * Login email
       */
      email: field.text().unique(),

      /**
       * Display name
       */
      name: field.text(),

      /**
       * Argon2id / bcrypt password hash
       */
      passwordHash: field.text(),

      /**
       * Avatar URL
       */
      image: field.text().optional(),

      /**
       * User biography
       */
      bio: field.text().optional(),

      /**
       * User role
       */
      role: field.namedType(Role).default("student"),

      /**
       * Current online status.
       *
       * This is application presence state,
       * NOT authentication state.
       */
      status: field.namedType(OnlineStatus).default("offline"),

      /**
       * Session generation.
       *
       * Every time this value changes,
       * all previous sessions become invalid.
       *
       * Example:
       *
       * User.sessionVersion = 3
       *
       * Session.sessionVersion = 3
       * => valid
       *
       * User.sessionVersion = 4
       * Session.sessionVersion = 3
       * => invalid
       */
      sessionVersion: field.int().default(0),

      createdAt: field.temporal.createdAtString(),

      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // ============================================================
  // Device
  // ============================================================

  const Device = model("Device", {
    fields: {
      /**
       * Primary Key
       */
      id: field.id.uuidv7String(),

      /**
       * User who owns this device.
       *
       * UNIQUE means:
       *
       * one User -> one Device
       *
       * This is the database-level guarantee
       * for your single-device login requirement.
       */
      userId: field.id.uuidv7String().unique(),

      /**
       * Stable identifier generated/stored by client.
       *
       * Do NOT use User-Agent as the device identity.
       */
      deviceKey: field.text().unique(),

      /**
       * Device platform.
       */
      platform: field.namedType(DevicePlatform),

      /**
       * Human-readable device name.
       *
       * Example:
       * "Chrome on Windows"
       * "Mike's Android"
       */
      name: field.text().optional(),

      /**
       * Latest User-Agent.
       */
      userAgent: field.text().optional(),

      /**
       * Latest IP address.
       */
      ip: field.text().optional(),

      /**
       * Last activity time.
       */
      lastSeenAt: field.temporal.timestamptzString().optional(),

      createdAt: field.temporal.createdAtString(),

      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // ============================================================
  // Session
  // ============================================================

  const Session = model("Session", {
    fields: {
      /**
       * Primary Key
       */
      id: field.id.uuidv7String(),

      /**
       * Session belongs to exactly one User.
       *
       * UNIQUE means:
       *
       * one User -> one Session
       */
      userId: field.id.uuidv7String().unique(),

      /**
       * Session belongs to exactly one Device.
       *
       * UNIQUE means:
       *
       * one Device -> one Session
       */
      deviceId: field.id.uuidv7String().unique(),

      /**
       * SHA-256 / HMAC hash of the raw session token.
       *
       * Raw token is stored only in the browser cookie.
       *
       * Database:
       * tokenHash
       *
       * Cookie:
       * raw token
       */
      tokenHash: field.text().unique(),

      /**
       * Copy of User.sessionVersion at creation time.
       *
       * Used for global session invalidation.
       */
      sessionVersion: field.int(),

      /**
       * User-Agent captured when session was created.
       */
      userAgent: field.text().optional(),

      /**
       * IP captured when session was created.
       */
      ip: field.text().optional(),

      /**
       * Session creation time.
       */
      createdAt: field.temporal.createdAtString(),

      /**
       * Session last updated time.
       */
      updatedAt: field.temporal.updatedAtString(),

      /**
       * Session expiration time.
       */
      expiresAt: field.temporal.timestamptzString(),

      /**
       * NULL:
       * session is not explicitly revoked.
       *
       * NOT NULL:
       * session has been revoked.
       */
      revokedAt: field.temporal.timestamptzString().optional(),
    },
  });

  // ============================================================
  // ResetToken
  // ============================================================

  const ResetToken = model("ResetToken", {
    fields: {
      /**
       * Primary Key
       */
      id: field.id.uuidv7String(),

      /**
       * User requesting password reset.
       */
      userId: field.id.uuidv7String(),

      /**
       * Hash of the password-reset token.
       *
       * Never store the raw token.
       */
      tokenHash: field.text().unique(),

      /**
       * Token expiration time.
       */
      expiresAt: field.temporal.timestamptzString(),

      /**
       * NULL:
       * token has not been used.
       *
       * NOT NULL:
       * token has already been consumed.
       */
      usedAt: field.temporal.timestamptzString().optional(),

      /**
       * Token creation time.
       */
      createdAt: field.temporal.createdAtString(),
    },
  });

  // ============================================================
  // EmailVerificationToken
  // ============================================================

  const EmailVerificationToken = model("EmailVerificationToken", {
    fields: {
      /**
       * Primary Key
       */
      id: field.id.uuidv7String(),

      /**
       * User requesting email verification.
       */
      userId: field.id.uuidv7String(),

      /**
       * Hash of verification token.
       *
       * Never store raw token.
       */
      tokenHash: field.text().unique(),

      /**
       * Token expiration time.
       */
      expiresAt: field.temporal.timestamptzString(),

      /**
       * NULL:
       * email has not been verified with this token.
       *
       * NOT NULL:
       * verification completed.
       */
      verifiedAt: field.temporal.timestamptzString().optional(),

      /**
       * Token creation time.
       */
      createdAt: field.temporal.createdAtString(),
    },
  });

  // ============================================================
  // RateLimit
  // ============================================================

  const RateLimit = model("RateLimit", {
    fields: {
      /**
       * Unique rate-limit bucket.
       *
       * Examples:
       *
       * login:ip:127.0.0.1
       * login:email:test@example.com
       * register:ip:127.0.0.1
       * reset:email:test@example.com
       */
      key: field.text().unique(),

      /**
       * Number of requests in current window.
       */
      count: field.int(),

      /**
       * Beginning of current rate-limit window.
       */
      windowStart: field.temporal.timestamptzString(),

      /**
       * Time when this rate-limit record expires.
       */
      expiresAt: field.temporal.timestamptzString(),
    },
  });

  // ============================================================
  // Return
  // ============================================================

  return {
    models: {
      User,
      Device,
      Session,
      ResetToken,
      EmailVerificationToken,
      RateLimit,
    },

    enums: {
      Role,
      OnlineStatus,
      DevicePlatform,
    },
  };
});
