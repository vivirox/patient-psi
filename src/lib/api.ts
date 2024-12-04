export function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function error(message: string, status = 500) {
  return json({ message }, status);
}

export function unauthorized(message = 'Unauthorized') {
  return error(message, 401);
}

export function notFound(message = 'Not found') {
  return error(message, 404);
}

export function badRequest(message = 'Bad request') {
  return error(message, 400);
}

export function created(data: any) {
  return json(data, 201);
}

export function noContent() {
  return new Response(null, { status: 204 });
}
