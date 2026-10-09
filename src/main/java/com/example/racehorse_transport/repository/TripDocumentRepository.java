package com.example.racehorse_transport.repository;

import com.example.racehorse_transport.entity.TripDocument;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripDocumentRepository extends JpaRepository<TripDocument, Integer> {
}
