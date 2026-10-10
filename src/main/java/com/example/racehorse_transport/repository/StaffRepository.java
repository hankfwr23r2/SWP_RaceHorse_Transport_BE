package com.example.racehorse_transport.repository;

import com.example.racehorse_transport.entity.Staff;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Integer> {

    long countByRoleIgnoreCase(String role);
}
