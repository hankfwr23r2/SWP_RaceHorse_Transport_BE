package com.example.racehorse_transport.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "SERVICE")
public class Service {
    @Id
    @Column(name = "ServiceID", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CategoryID")
    private Category categoryID;

    @Size(max = 255)
    @Nationalized
    @Column(name = "ServiceName")
    private String serviceName;

    @Column(name = "price", precision = 18, scale = 2)
    private BigDecimal price;

    @Size(max = 50)
    @Column(name = "status", length = 50)
    private String status;


}