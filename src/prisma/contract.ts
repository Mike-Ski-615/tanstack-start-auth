import { defineContract } from "@prisma/orm-postgres/contract-builder";

export const contract = defineContract({}, ({ field, model, rel }) => {
  const User = model("User", {
    fields: {
      id: field.id.uuidv7String(),
      email: field.text().unique(),
      name: field.text(),
      passwordHash: field.text(),
      image: field.text(),
      bio: field.text(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  const Token = model("Token", {
    fields: {
      id: field.id.uuidv7String(),
      tokenHash: field.text().unique(),
      purpose: field.text(),
      userId: field.uuidString(),
      expiresAt: field.temporal.timestamptzString(),
      lastSentAt: field.temporal.timestamptzString(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  const Post = model("Post", {
    fields: {
      id: field.id.uuidv7String(),
      title: field.text(),
      content: field.text().optional(),
      authorId: field.uuidString(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  const Session = model("Session", {
    fields: {
      id: field.id.uuidv7String(),
      tokenHash: field.text().unique(),
      userId: field.uuidString(),
      expiresAt: field.temporal.timestamptzString(),
      revokedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  return {
    models: {
      User: User.relations({
        posts: rel.hasMany(Post, {
          by: "authorId",
        }),
        sessions: rel.hasMany(Session, {
          by: "userId",
        }),
        tokens: rel.hasMany(Token, {
          by: "userId",
        }),
      }),
      Post: Post.relations({
        author: rel.belongsTo(User, {
          from: "authorId",
          to: "id",
        }),
      }),
      Session: Session.relations({
        user: rel
          .belongsTo(User, {
            from: "userId",
            to: "id",
          })
          .sql({
            fk: {
              onDelete: "cascade",
            },
          }),
      }),
      Token: Token.relations({
        user: rel
          .belongsTo(User, {
            from: "userId",
            to: "id",
          })
          .sql({
            fk: {
              onDelete: "cascade",
            },
          }),
      }),
    },
  };
});
