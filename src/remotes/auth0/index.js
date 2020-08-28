import fs from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { scopes, requireScope } from '../../auth';
import query from './query';

const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.gql')).toString();

export default function createAuth0Schema(domain, clientId, clientSecret) {
  const { findUsers, getRolesForUser, findUsersByRole } = query(domain, clientId, clientSecret);

  const resolvers = {};
  resolvers.Query = {
    getUser: async (_, { where }, ctx) => (await findUsers(where, ctx))[0] || null,
    searchUsers: async (_, { where }, ctx) => findUsers(where, ctx),
    roleUsers: async (_, { roleId }, ctx) => findUsersByRole(roleId, ctx),
  };
  resolvers.User = {
    roles: async ({ id }, _, ctx) => requireScope(ctx, scopes.readUserRoles) && getRolesForUser(id),
    picture: async ({ picture }, { transform }) => {
      if (!transform || Object.keys(transform).length === 0) return picture;

      if (picture.match(/gravatar\.com/)) {
        const maxDimension = Math.max(transform.width || 0, transform.height || 0);
        const sizelessUrl = picture.replace(/s=\d+/, '');
        return `${sizelessUrl}${sizelessUrl.match(/\?/) ? '&' : '?'}s=${maxDimension}`;
      }

      const imgArgs = Object.keys(transform)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(transform[key]).toLowerCase()}`)
        .join(';');

      return picture
        .replace(/https:\/\/img.codeday.org\/[a-zA-Z0-9]+\//, `https://img.codeday.org/${imgArgs}/`);
    },
  };

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  return { schema };
}
