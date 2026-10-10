package com.example.racehorse_transport.service;

import com.example.racehorse_transport.entity.TripDocument;

import java.util.List;
import java.util.Optional;

public interface TripDocumentService {
    List<TripDocument> findAll();
    Optional<TripDocument> findById(Integer id);
    TripDocument save(TripDocument entity);
    void deleteById(Integer id);
}
