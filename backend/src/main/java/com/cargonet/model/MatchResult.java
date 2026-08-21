package com.cargonet.model;

public class MatchResult {
    private Truck truck;
    private Cargo cargo;
    private int matchScore; // Total out of 100
    private int routeScore; // out of 40
    private int capacityScore; // out of 30
    private int dateScore; // out of 20
    private int vehicleTypeScore; // out of 10
    private boolean bestMatch;
    private String matchBadge; // "100% BEST MATCH" or "MATCHED"

    public MatchResult() {}

    public MatchResult(Truck truck, Cargo cargo, int routeScore, int capacityScore, int dateScore, int vehicleTypeScore) {
        this.truck = truck;
        this.cargo = cargo;
        this.routeScore = routeScore;
        this.capacityScore = capacityScore;
        this.dateScore = dateScore;
        this.vehicleTypeScore = vehicleTypeScore;
        this.matchScore = routeScore + capacityScore + dateScore + vehicleTypeScore;
        this.bestMatch = (this.matchScore >= 90);
        this.matchBadge = this.bestMatch ? "100% BEST MATCH" : (this.matchScore + "% MATCH");
    }

    public Truck getTruck() { return truck; }
    public void setTruck(Truck truck) { this.truck = truck; }

    public Cargo getCargo() { return cargo; }
    public void setCargo(Cargo cargo) { this.cargo = cargo; }

    public int getMatchScore() { return matchScore; }
    public void setMatchScore(int matchScore) { this.matchScore = matchScore; }

    public int getRouteScore() { return routeScore; }
    public void setRouteScore(int routeScore) { this.routeScore = routeScore; }

    public int getCapacityScore() { return capacityScore; }
    public void setCapacityScore(int capacityScore) { this.capacityScore = capacityScore; }

    public int getDateScore() { return dateScore; }
    public void setDateScore(int dateScore) { this.dateScore = dateScore; }

    public int getVehicleTypeScore() { return vehicleTypeScore; }
    public void setVehicleTypeScore(int vehicleTypeScore) { this.vehicleTypeScore = vehicleTypeScore; }

    public boolean isBestMatch() { return bestMatch; }
    public void setBestMatch(boolean bestMatch) { this.bestMatch = bestMatch; }

    public String getMatchBadge() { return matchBadge; }
    public void setMatchBadge(String matchBadge) { this.matchBadge = matchBadge; }
}
