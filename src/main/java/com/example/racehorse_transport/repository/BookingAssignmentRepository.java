package com.example.racehorse_transport.repository;

import com.example.racehorse_transport.entity.BookingAssignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingAssignmentRepository extends JpaRepository<BookingAssignment, Integer> {
}
