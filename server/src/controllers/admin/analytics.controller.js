import User from "../../models/User.js";
import Listing from "../../models/Listing.js";
import Claim from "../../models/Claim.js";
import ListingCategory from "../../models/ListingCategory.js";
import AuditLog from "../../models/AuditLog.js";

/**
 * GET /api/v1/admin/analytics/overview
 *
 * Platform-wide summary counters for the dashboard summary cards.
 */
export async function getOverview(_req, res, next) {
  try {
    const [
      totalUsers,
      activeUsers,
      totalListings,
      activeListings,
      pendingListings,
      completedSwaps,
      pendingSwapRequests,
      totalCategories,
      swapValueAgg,
    ] = await Promise.all([
      User.countDocuments({ status: { $ne: "deleted" } }),
      User.countDocuments({ status: "active" }),
      Listing.countDocuments({}),
      Listing.countDocuments({ status: "available" }),
      Listing.countDocuments({ status: "pending" }),
      Listing.countDocuments({ status: "completed" }),
      Claim.countDocuments({ status: { $in: ["submitted", "pending"] } }),
      ListingCategory.countDocuments({ isActive: true }),
      Listing.aggregate([
        {
          $match: {
            status: "completed",
            listingType: "exchange",
            "exchange.referencePrice": { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$exchange.referencePrice" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalSwapValue = swapValueAgg[0]?.total ?? 0;

    return res.json({
      ok: true,
      overview: {
        totalUsers,
        activeUsers,
        totalListings,
        activeListings,
        pendingListings,
        completedSwaps,
        pendingSwapRequests,
        totalCategories,
        totalSwapValue,
      },
    });
  } catch (err) {
    return next(err);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/v1/admin/analytics/growth?metric=users|listings&range=30d|12m
 *
 * Returns a time-bucketed series for the growth charts. `30d` buckets by day,
 * `12m` buckets by month. The series is zero-filled so the chart has a
 * continuous x-axis.
 */
export async function getGrowth(req, res, next) {
  try {
    const metric = req.query.metric === "listings" ? "listings" : "users";
    const range = req.query.range === "12m" ? "12m" : "30d";
    const Model = metric === "listings" ? Listing : User;

    const now = new Date();
    let start;
    let dateFormat;
    if (range === "12m") {
      start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      dateFormat = "%Y-%m";
    } else {
      start = new Date(now.getTime() - 29 * DAY_MS);
      start.setHours(0, 0, 0, 0);
      dateFormat = "%Y-%m-%d";
    }

    const rows = await Model.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const counts = new Map(rows.map((r) => [r._id, r.count]));
    const series = [];
    if (range === "12m") {
      for (let i = 0; i < 12; i += 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        series.push({ date: key, count: counts.get(key) ?? 0 });
      }
    } else {
      for (let i = 0; i < 30; i += 1) {
        const d = new Date(start.getTime() + i * DAY_MS);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        series.push({ date: key, count: counts.get(key) ?? 0 });
      }
    }

    return res.json({ ok: true, metric, range, series });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/admin/analytics/recent
 *
 * Latest registered users, latest listings, and recent admin/system
 * activities for the dashboard activity feed.
 */
export async function getRecent(_req, res, next) {
  try {
    const [latestUsers, latestListings, recentActivities] = await Promise.all([
      User.find({ status: { $ne: "deleted" } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("fullName email profileImageUrl status createdAt")
        .lean(),
      Listing.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title listingType status imageUrl categoryName createdAt ownerUserId")
        .lean(),
      AuditLog.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return res.json({
      ok: true,
      latestUsers: latestUsers.map((u) => ({
        id: String(u._id),
        fullName: u.fullName,
        email: u.email,
        profileImageUrl: u.profileImageUrl ?? "",
        status: u.status,
        createdAt: u.createdAt,
      })),
      latestListings: latestListings.map((l) => ({
        id: String(l._id),
        title: l.title,
        listingType: l.listingType,
        status: l.status,
        imageUrl: l.imageUrl ?? "",
        categoryName: l.categoryName ?? "",
        createdAt: l.createdAt,
      })),
      recentActivities: recentActivities.map((a) => ({
        id: String(a._id),
        entityType: a.entityType,
        entityId: a.entityId ? String(a.entityId) : null,
        action: a.action,
        metadata: a.metadata ?? {},
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}
