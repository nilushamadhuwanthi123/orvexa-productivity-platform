export const ok = (res, data, meta) =>
  res.status(200).json({ success: true, data, ...(meta ? { meta } : {}) });

export const created = (res, data) => res.status(201).json({ success: true, data });

export const noContent = (res) => res.status(204).send();

export const paginated = (res, items, { page, limit, total }) =>
  res.status(200).json({
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
    },
  });
