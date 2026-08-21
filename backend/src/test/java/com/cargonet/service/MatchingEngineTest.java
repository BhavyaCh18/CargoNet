package com.cargonet.service;

import com.cargonet.model.Cargo;
import com.cargonet.model.MatchResult;
import com.cargonet.model.Truck;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

public class MatchingEngineTest {

    private MatchingEngine matchingEngine;

    @BeforeEach
    public void setUp() {
        matchingEngine = new MatchingEngine();
    }

    @Test
    public void testDirectRouteAndSufficientCapacityGets100PercentMatch() {
        Cargo cargo = new Cargo();
        cargo.setId(1);
        cargo.setCargoName("Office Furniture");
        cargo.setPickupLocation("Hyderabad");
        cargo.setDestination("Bengaluru");
        cargo.setWeight(12.0);
        cargo.setPickupDate(LocalDate.now());

        Truck truck = new Truck();
        truck.setId(1);
        truck.setVehicleNumber("AP39XX1234");
        truck.setVehicleType("Container 20ft");
        truck.setMaxCapacity(20.0);
        truck.setAvailableCapacity(20.0);
        truck.setCurrentLocation("Hyderabad");
        truck.setDestination("Bengaluru");
        truck.setStatus("AVAILABLE");

        MatchResult result = matchingEngine.calculateMatch(cargo, truck);

        assertNotNull(result);
        assertEquals(100, result.getMatchScore());
        assertEquals(40, result.getRouteScore());
        assertEquals(30, result.getCapacityScore());
        assertEquals(20, result.getDateScore());
        assertEquals(10, result.getVehicleTypeScore());
        assertTrue(result.isBestMatch());
        assertEquals("100% BEST MATCH", result.getMatchBadge());
    }

    @Test
    public void testInsufficientCapacityIsFilteredOut() {
        Cargo cargo = new Cargo();
        cargo.setPickupLocation("Hyderabad");
        cargo.setDestination("Bengaluru");
        cargo.setWeight(30.0); // 30 tons

        Truck truck = new Truck();
        truck.setMaxCapacity(20.0); // Only 20 tons
        truck.setAvailableCapacity(20.0);
        truck.setCurrentLocation("Hyderabad");
        truck.setDestination("Bengaluru");

        MatchResult result = matchingEngine.calculateMatch(cargo, truck);
        assertNull(result, "Truck with insufficient capacity should be excluded.");
    }
}
