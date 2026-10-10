package com.example.racehorse_transport.service;

import com.example.racehorse_transport.entity.Route;

import java.util.List;
import java.util.Optional;

public interface RouteService {
    List<Route> findAll();
    Optional<Route> findById(Integer id);
    Route save(Route entity);
    void deleteById(Integer id);
}
