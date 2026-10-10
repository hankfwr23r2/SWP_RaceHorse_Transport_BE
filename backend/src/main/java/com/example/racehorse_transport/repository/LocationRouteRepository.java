package com.example.racehorse_transport.repository;

import com.example.racehorse_transport.entity.LocationRoute;
import com.example.racehorse_transport.entity.LocationRouteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationRouteRepository extends JpaRepository<LocationRoute, LocationRouteId> {
}
