package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Review;
import com.cargonet.repository.ReviewRepository;
import io.javalin.http.Context;

import java.util.List;
import java.util.Map;

public class ReviewController {
    private final ReviewRepository reviewRepository;

    public ReviewController(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public void createReview(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        String userIdStr = ctx.attribute("userId");
        Integer businessId = userIdStr != null ? Integer.parseInt(userIdStr) : null;

        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        Review review = new Review();
        if (body.get("bookingId") != null) review.setBookingId(Integer.parseInt(body.get("bookingId").toString()));
        if (body.get("truckId") != null) review.setTruckId(Integer.parseInt(body.get("truckId").toString()));
        review.setBusinessId(businessId);
        review.setRating(Integer.parseInt(body.get("rating").toString()));
        review.setComment((String) body.get("comment"));

        Review saved = reviewRepository.save(review);
        ctx.status(201).json(saved);
    }

    public void getReviewsByTruckId(Context ctx) {
        Integer truckId = Integer.parseInt(ctx.pathParam("truckId"));
        List<Review> list = reviewRepository.findByTruckId(truckId);
        ctx.json(list);
    }
}
