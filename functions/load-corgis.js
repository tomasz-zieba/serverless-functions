const fetch = require("node-fetch");
const { hasuraRequest } = require("./util/hasura");

exports.handler = async () => {
  const corgis = await fetch(
    "https://api.unsplash.com/collections/50085020/photos",
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    }
  ).then((res) => res.json());

  const hasuraData = await hasuraRequest({
    query: `
      mutation InsertOrUpdateBoops($corgis: [boops_insert_input!]!) {
        boops: insert_boops(objects: $corgis, on_conflict: {constraint: boops_pkey, update_columns: id}) {
          returning {
            id
            count
          }
        }
      }
    `,
    variables: {
      corgis: corgis.map(({ id }) => ({ id, count: 0 })),
    },
  });

  const completeData = corgis.map((corgi) => {
    const boops = hasuraData.boops.returning.find((b) => b.id === corgi.id);
    return {
      ...corgi,
      alt: corgi.alt_description,
      credit: corgi.user.name,
      url: `${corgi.urls.raw}&auto=format&fit=crop&w=300&h=300&q=80&crop=entropy`,
      boops: boops.count,
    };
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(completeData),
  };
};
